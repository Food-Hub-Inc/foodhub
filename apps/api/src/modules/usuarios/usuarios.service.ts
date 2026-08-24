import {
  and,
  count,
  desc,
  eq,
  ilike,
  max,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { cocinero, usuario, versionTerminos } from '@foodhub/db';
import {
  MENSAJES_USUARIO,
  type CambiarPasswordInput,
  type CrearUsuarioPanelInput,
  type EditarPerfilInput,
  type EditarUsuarioPanelInput,
  type FiltrosUsuario,
  type PaginaUsuarios,
  type PerfilUsuario,
  type Ubicacion,
} from '@foodhub/shared';
import { env } from '../../config/env.js';
import { db } from '../../lib/db.js';
import {
  conCompensacionDeCuenta,
  crearClienteAnonimo,
  esCorreoYaRegistrado,
  revocarSesiones,
  supabaseAdmin,
} from '../../lib/supabase.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { limpiarFotosDePerfilAnteriores } from '../almacenamiento/almacenamiento.service.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';
import { bloquearConversacionesPorBaja } from '../mensajeria/mensajeria.service.js';

/**
 * Modulo de Gestion de Usuarios, Roles y Permisos (US-GURP-01 a US-GURP-09).
 *
 * Dos superficies con reglas distintas conviven en este servicio:
 *
 *   PERFIL PROPIO  opera SIEMPRE sobre el id de la sesion. Ninguna funcion de
 *                  este grupo recibe un id por parametro, asi que no existe la
 *                  posibilidad de tocar el perfil ajeno cambiando un numero en
 *                  la URL.
 *   PANEL ADMIN    recibe el id del usuario afectado y el del administrador que
 *                  ejecuta, porque la auditoria tiene que distinguirlos.
 */

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type FilaUsuario = typeof usuario.$inferSelect;

/**
 * Clave del lock consultivo que serializa los cambios sobre administradores.
 *
 * Es un numero arbitrario pero fijo: `pg_advisory_xact_lock` solo exige que
 * todas las transacciones que compiten por el mismo recurso usen el mismo
 * valor. Se libera solo al terminar la transaccion.
 */
const CLAVE_LOCK_ADMINISTRADORES = 210_820_265;

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Traduce una fila de la base al contrato publico del perfil.
 *
 * `descripcionPublica` y `ubicacion` solo se incluyen para el cocinero: el
 * cliente y el administrador no tienen fila en `cocinero` y devolverles esos
 * campos en null sugeriria que podrian completarlos.
 */
export function aPerfilUsuario(
  fila: FilaUsuario,
  descripcionPublica: string | null,
): PerfilUsuario {
  const base = {
    id: fila.id,
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    tipo: fila.tipo,
    fotoPerfilUrl: fila.fotoPerfilUrl,
    estadoCuenta: fila.estadoCuenta,
    fechaRegistro: fila.fechaRegistro.toISOString(),
  };

  if (fila.tipo !== 'COCINERO') return base;

  return {
    ...base,
    descripcionPublica,
    // PostGIS ordena el punto como (x = lng, y = lat). Invertirlos ubica al
    // cocinero en otro continente sin que falle ninguna validacion.
    ubicacion: fila.ubicacion
      ? { lat: fila.ubicacion.y, lng: fila.ubicacion.x }
      : null,
  };
}

/**
 * US-CFG-04 (RF058) - Si hay una versión de términos y/o de política de
 * privacidad más nueva que la última que el usuario aceptó.
 *
 * Un solo checkbox acepta los dos documentos juntos (criterio de aceptación
 * de US-CFG-04), así que alcanza con comparar `fecha_aceptacion_terminos`
 * contra la publicación más reciente entre ambos tipos: no hace falta una
 * columna de aceptación por documento.
 */
async function calcularDebeAceptarTerminos(
  fechaAceptacionTerminos: Date | null,
): Promise<boolean> {
  const [fila] = await db
    .select({ maxFecha: max(versionTerminos.fechaPublicacion) })
    .from(versionTerminos)
    .where(eq(versionTerminos.estadoVersionTerminos, 'VIGENTE'));

  const ultimaPublicacion = fila?.maxFecha;
  if (!ultimaPublicacion) return false; // todavia no se publico nada (bootstrap)
  if (!fechaAceptacionTerminos) return true;
  return fechaAceptacionTerminos < ultimaPublicacion;
}

/** US-GURP-01 y US-GURP-05 - Perfil completo, con los datos del cocinero si aplica. */
export async function obtenerPerfil(usuarioId: string): Promise<PerfilUsuario> {
  const [fila] = await db
    .select({ usuario, descripcionPublica: cocinero.descripcionPublica })
    .from(usuario)
    .leftJoin(cocinero, eq(cocinero.usuarioId, usuario.id))
    .where(eq(usuario.id, usuarioId))
    .limit(1);

  if (!fila) throw noEncontrado('el usuario');

  const debeAceptarTerminos = await calcularDebeAceptarTerminos(
    fila.usuario.fechaAceptacionTerminos,
  );
  return {
    ...aPerfilUsuario(fila.usuario, fila.descripcionPublica),
    debeAceptarTerminos,
  };
}

/**
 * US-CFG-04 (RF058) - Re-aceptación de los términos vigentes, sexto criterio
 * de aceptación: el checkbox obligatorio de la app móvil al iniciar sesión
 * después de una publicación nueva.
 */
export async function aceptarTerminosVigentes(
  usuarioId: string,
): Promise<void> {
  await db
    .update(usuario)
    .set({ terminosAceptados: true, fechaAceptacionTerminos: sql`now()` })
    .where(eq(usuario.id, usuarioId));
}

// ---------------------------------------------------------------------------
// Perfil propio (US-GURP-01 a US-GURP-04) - PAN-GURP-01
// ---------------------------------------------------------------------------

/**
 * Convierte el punto del contrato al orden que espera PostGIS.
 *
 * El GPS y el mapa hablan de latitud/longitud; la columna `geometry(point)`
 * guarda (x = lng, y = lat). Es la unica traduccion del sistema donde un error
 * de orden no rompe nada visible: la cuenta se guarda igual, pero el cocinero
 * queda ubicado en otro continente.
 */
function aPunto(ubicacion: Ubicacion): { x: number; y: number } {
  return { x: ubicacion.lng, y: ubicacion.lat };
}

/** Campos del perfil que el propio usuario puede editar (RF088). */
function cambiosDePerfil(datos: EditarPerfilInput) {
  return {
    ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
    ...(datos.apellido !== undefined ? { apellido: datos.apellido } : {}),
    ...(datos.fotoPerfilUrl !== undefined
      ? { fotoPerfilUrl: datos.fotoPerfilUrl }
      : {}),
    ...(datos.ubicacion !== undefined
      ? { ubicacion: aPunto(datos.ubicacion) }
      : {}),
  };
}

/** US-GURP-02 - Edicion parcial del perfil propio. */
export async function editarPerfil(entrada: {
  usuarioId: string;
  tipo: FilaUsuario['tipo'];
  datos: EditarPerfilInput;
  ipOrigen: string | null;
}): Promise<PerfilUsuario> {
  const { usuarioId, datos } = entrada;
  const tocaCamposDeCocinero =
    datos.descripcionPublica !== undefined || datos.ubicacion !== undefined;

  // El contrato acota esos dos campos al cocinero. Se rechaza en lugar de
  // ignorarlos en silencio: descartar un dato que el usuario cree guardado es
  // peor que decirle que no puede guardarlo.
  if (tocaCamposDeCocinero && entrada.tipo !== 'COCINERO') {
    throw new AppError(
      403,
      MENSAJES_USUARIO.accesoNoAutorizado,
      'CAMPO_NO_PERMITIDO',
    );
  }

  await db.transaction(async (tx) => {
    const cambios = cambiosDePerfil(datos);
    if (Object.keys(cambios).length > 0) {
      await tx.update(usuario).set(cambios).where(eq(usuario.id, usuarioId));
    }

    if (datos.descripcionPublica !== undefined) {
      await tx
        .insert(cocinero)
        .values({ usuarioId, descripcionPublica: datos.descripcionPublica })
        .onConflictDoUpdate({
          target: cocinero.usuarioId,
          set: { descripcionPublica: datos.descripcionPublica },
        });
    }
  });

  /**
   * La foto anterior se borra DESPUES de que la URL nueva quedo guardada, y
   * solo si el campo participo de esta edicion. Con `null` —el usuario quito su
   * foto— la carpeta queda vacia, que es justamente lo que corresponde.
   */
  if (datos.fotoPerfilUrl !== undefined) {
    void limpiarFotosDePerfilAnteriores(usuarioId, datos.fotoPerfilUrl ?? '');
  }

  void registrarOperacion({
    usuarioId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'usuario',
    objetoAfectadoId: usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos) },
  });

  return obtenerPerfil(usuarioId);
}

/**
 * US-GURP-03 - Cambio de la contrasena propia.
 *
 * Reautentica con la contrasena actual aunque la sesion ya este iniciada: sin
 * eso, cualquiera que encuentre el telefono desbloqueado se apodera de la
 * cuenta. La verificacion la hace GoTrue, que es quien guarda el hash.
 */
export async function cambiarPassword(entrada: {
  usuarioId: string;
  email: string;
  datos: CambiarPasswordInput;
  ipOrigen: string | null;
}): Promise<void> {
  const cliente = crearClienteAnonimo();
  const { data, error } = await cliente.auth.signInWithPassword({
    email: entrada.email,
    password: entrada.datos.passwordActual,
  });

  if (error || !data.session) {
    throw new AppError(
      400,
      MENSAJES_USUARIO.contrasenaActualIncorrecta,
      'PASSWORD_ACTUAL_INCORRECTA',
    );
  }

  // La reautenticacion crea una sesion nueva en GoTrue que nadie va a usar. Si
  // no se revoca queda un refresh token valido por semanas por cada cambio de
  // contrasena.
  await revocarSesiones(data.session.access_token, 'local');

  const { error: errorActualizacion } =
    await supabaseAdmin.auth.admin.updateUserById(entrada.usuarioId, {
      password: entrada.datos.password,
    });

  if (errorActualizacion) throw errorActualizacion;

  void registrarOperacion({
    usuarioId: entrada.usuarioId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'usuario',
    objetoAfectadoId: entrada.usuarioId,
    ipOrigen: entrada.ipOrigen,
    // Solo se deja constancia de QUE cambio. Ni la contrasena vieja ni la
    // nueva pueden quedar en un registro que el panel muestra en pantalla.
    datosAdicionales: { campos: ['password'] },
  });
}

/**
 * US-GURP-04 - Baja logica de la cuenta propia.
 *
 * La fila NUNCA se borra: los pedidos, resenas y conversaciones historicas
 * tienen que seguir siendo legibles para la contraparte.
 *
 * NO ESTA HABILITADA PARA EL ADMINISTRADOR. US-GURP-04 lista como actores
 * unicamente a Cliente y Cocinero; la baja de una cuenta administradora se
 * gestiona desde el panel por US-GURP-09, que si aplica la salvaguarda del
 * ultimo administrador. Permitirla aca seria el unico camino del sistema para
 * quedarse sin acceso al panel sin que nada lo advierta.
 */
export async function eliminarCuentaPropia(entrada: {
  usuarioId: string;
  tipo: FilaUsuario['tipo'];
  accessToken: string;
  ipOrigen: string | null;
}): Promise<void> {
  if (entrada.tipo === 'ADMINISTRADOR') {
    throw new AppError(
      403,
      MENSAJES_USUARIO.accesoNoAutorizado,
      'BAJA_NO_PERMITIDA',
    );
  }

  /**
   * US-MSG-07 - La baja y el bloqueo de las conversaciones son UNA operacion.
   * Si la cuenta quedara ELIMINADA y el UPDATE de `conversacion` fallara, la
   * contraparte seguiria viendo un chat abierto contra alguien que ya no esta y
   * sus mensajes se perderian en el vacio.
   */
  await db.transaction(async (tx) => {
    await tx
      .update(usuario)
      .set({ estadoCuenta: 'ELIMINADA' })
      .where(eq(usuario.id, entrada.usuarioId));

    await bloquearConversacionesPorBaja(tx, entrada.usuarioId);
  });

  // Alcance global: la cuenta tiene que dejar de funcionar en todos los
  // dispositivos donde haya sesion abierta, no solo en el que pidio la baja.
  await revocarSesiones(entrada.accessToken, 'global');

  void registrarOperacion({
    usuarioId: entrada.usuarioId,
    operacion: 'BAJA',
    tipoObjeto: 'usuario',
    objetoAfectadoId: entrada.usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { motivo: 'baja solicitada por el propio usuario' },
  });
}

// ---------------------------------------------------------------------------
// Panel de administracion (US-GURP-05 a US-GURP-09) - PAN-ADM-01
// ---------------------------------------------------------------------------

/** US-GURP-05 - Un unico campo de busqueda cubre nombre, apellido y correo. */
function armarFiltroUsuarios(filtros: FiltrosUsuario): SQL | undefined {
  const condiciones: SQL[] = [];

  if (filtros.busqueda) {
    const patron = `%${filtros.busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    const porTexto = or(
      ilike(usuario.nombre, patron),
      ilike(usuario.apellido, patron),
      ilike(usuario.email, patron),
    );
    if (porTexto) condiciones.push(porTexto);
  }
  if (filtros.tipo) condiciones.push(eq(usuario.tipo, filtros.tipo));
  if (filtros.estadoCuenta) {
    condiciones.push(eq(usuario.estadoCuenta, filtros.estadoCuenta));
  }

  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

/** US-GURP-05 - Listado paginado del panel. */
export async function listarUsuarios(
  filtros: FiltrosUsuario,
): Promise<PaginaUsuarios> {
  const filtro = armarFiltroUsuarios(filtros);

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        tipo: usuario.tipo,
        estadoCuenta: usuario.estadoCuenta,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
        fechaRegistro: usuario.fechaRegistro,
      })
      .from(usuario)
      .where(filtro)
      // Sin orden explicito PostgreSQL no garantiza ninguno, y dos paginas
      // consecutivas podrian repetir o saltear filas. El mas reciente primero
      // es ademas el orden natural del listado del panel.
      .orderBy(desc(usuario.fechaRegistro))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(usuario).where(filtro),
  ]);

  return {
    datos: filas.map((fila) => ({
      ...fila,
      fechaRegistro: fila.fechaRegistro.toISOString(),
    })),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/**
 * US-GURP-06 - Alta por invitacion.
 *
 * `inviteUserByEmail` crea la cuenta SIN contrasena y le manda al usuario un
 * enlace para definir la suya. El administrador nunca conoce una credencial
 * ajena, que es justamente lo que evita que el alta desde el panel se convierta
 * en una via para suplantar a alguien.
 *
 * El enlace lleva a lugares distintos segun el rol, y no puede ser uno solo:
 * el administrador define su contrasena en el panel web, que es donde va a
 * trabajar, y el cliente en la app movil, que es la unica interfaz que tiene.
 * Mandar a los dos al mismo destino deja a uno de los dos sin poder terminar
 * el alta.
 */
const DESTINO_INVITACION: Record<CrearUsuarioPanelInput['tipo'], string> = {
  ADMINISTRADOR: env.URL_INVITACION_PANEL,
  CLIENTE: env.URL_RECUPERACION_PASSWORD,
};

export async function crearUsuarioPanel(entrada: {
  datos: CrearUsuarioPanelInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<PerfilUsuario> {
  const { datos } = entrada;
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    datos.email,
    { redirectTo: DESTINO_INVITACION[datos.tipo] },
  );

  if (error) {
    if (esCorreoYaRegistrado(error)) {
      throw new AppError(
        409,
        MENSAJES_USUARIO.correoYaRegistrado,
        'CORREO_DUPLICADO',
      );
    }
    throw error;
  }

  const idNuevo = data.user.id;

  await conCompensacionDeCuenta(idNuevo, () =>
    db.insert(usuario).values({
      id: idNuevo,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      tipo: datos.tipo,
    }),
  );

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'usuario',
    objetoAfectadoId: idNuevo,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { email: datos.email, tipo: datos.tipo },
  });

  return obtenerPerfil(idNuevo);
}

/**
 * Salvaguarda del ultimo administrador (US-GURP-07 y US-GURP-09, extendida
 * por decision del equipo a la suspension de US-GURP-08).
 *
 * El lock consultivo NO es decorativo. Contar administradores dentro de una
 * transaccion no alcanza: en READ COMMITTED dos transacciones concurrentes leen
 * ambas "quedan 2 administradores", se dan de baja mutuamente y el sistema
 * queda sin acceso al panel de forma irreversible. `pg_advisory_xact_lock`
 * serializa la seccion critica y solo esta: no bloquea ninguna otra operacion
 * sobre `usuario`.
 */
async function verificarQuedaOtroAdministrador(
  tx: Transaccion,
  idExcluido: string,
): Promise<void> {
  // `sql.raw` y no un parametro: `pg_advisory_xact_lock` esta sobrecargada
  // para (bigint) y (int, int), y un parametro sin tipo declarado obliga a
  // PostgreSQL a resolver la ambiguedad. El valor es una constante del modulo,
  // no una entrada del usuario, asi que interpolarla no abre una inyeccion.
  await tx.execute(
    sql.raw(
      `select pg_advisory_xact_lock(${String(CLAVE_LOCK_ADMINISTRADORES)})`,
    ),
  );

  const [fila] = await tx
    .select({ total: count() })
    .from(usuario)
    .where(
      and(
        eq(usuario.tipo, 'ADMINISTRADOR'),
        eq(usuario.estadoCuenta, 'ACTIVA'),
        ne(usuario.id, idExcluido),
      ),
    );

  if ((fila?.total ?? 0) === 0) {
    throw new AppError(
      409,
      MENSAJES_USUARIO.ultimoAdministrador,
      'ULTIMO_ADMINISTRADOR',
    );
  }
}

/** Estado actual del usuario afectado, leido dentro de la transaccion que escribe. */
async function leerEstadoActual(
  tx: Transaccion,
  usuarioId: string,
): Promise<Pick<FilaUsuario, 'tipo' | 'estadoCuenta'>> {
  const [fila] = await tx
    .select({ tipo: usuario.tipo, estadoCuenta: usuario.estadoCuenta })
    .from(usuario)
    .where(eq(usuario.id, usuarioId))
    .limit(1);

  if (!fila) throw noEncontrado('el usuario');
  return fila;
}

/**
 * Solo hay riesgo si el afectado es HOY un administrador activo.
 *
 * Sin `tipoDestino` la pregunta es "esta cuenta sale del conjunto de
 * administradores activos", que es lo que hacen la baja y la suspension. Con
 * `tipoDestino` se agrega la condicion del cambio de rol.
 */
function dejaDeSerAdministradorActivo(
  actual: Pick<FilaUsuario, 'tipo' | 'estadoCuenta'>,
  tipoDestino?: EditarUsuarioPanelInput['tipo'],
): boolean {
  if (actual.tipo !== 'ADMINISTRADOR' || actual.estadoCuenta !== 'ACTIVA') {
    return false;
  }
  return tipoDestino === undefined || tipoDestino !== 'ADMINISTRADOR';
}

/** US-GURP-07 - Edicion de datos administrativos y rol. */
export async function editarUsuarioPanel(entrada: {
  usuarioId: string;
  datos: EditarUsuarioPanelInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<PerfilUsuario> {
  const { usuarioId, datos } = entrada;

  await db.transaction(async (tx) => {
    const actual = await leerEstadoActual(tx, usuarioId);
    if (datos.tipo && dejaDeSerAdministradorActivo(actual, datos.tipo)) {
      await verificarQuedaOtroAdministrador(tx, usuarioId);
    }
    await tx.update(usuario).set(datos).where(eq(usuario.id, usuarioId));
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'usuario',
    objetoAfectadoId: usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos), ...datos },
  });

  return obtenerPerfil(usuarioId);
}

/**
 * US-GURP-08 - Suspension de una cuenta, con motivo obligatorio.
 *
 * EXTENSION DECIDIDA POR EL EQUIPO, no criterio textual de US-GURP-08: la
 * salvaguarda del ultimo administrador se aplica tambien aca. Una suspension
 * bloquea el login exactamente igual que una baja, con lo cual el efecto sobre
 * el sistema es el mismo y el criterio de US-GURP-07 y US-GURP-09 aplica por
 * analogia directa. Sin esto quedaba un camino para perder el acceso al panel.
 */
export async function suspenderUsuario(entrada: {
  usuarioId: string;
  motivo: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { usuarioId } = entrada;

  await db.transaction(async (tx) => {
    const actual = await leerEstadoActual(tx, usuarioId);
    if (dejaDeSerAdministradorActivo(actual)) {
      await verificarQuedaOtroAdministrador(tx, usuarioId);
    }
    await tx
      .update(usuario)
      .set({ estadoCuenta: 'SUSPENDIDA', motivoSuspension: entrada.motivo })
      .where(eq(usuario.id, usuarioId));
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'usuario',
    objetoAfectadoId: usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      estadoCuenta: 'SUSPENDIDA',
      motivoSuspension: entrada.motivo,
    },
  });
}

/** US-GURP-08 - Levantamiento de la suspension. */
export async function rehabilitarUsuario(entrada: {
  usuarioId: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { usuarioId } = entrada;

  await db.transaction(async (tx) => {
    await leerEstadoActual(tx, usuarioId);
    // El motivo se limpia junto con el estado: si quedara, el soporte le
    // seguiria explicando al usuario una suspension que ya no existe. El
    // historial de la suspension vive en `registro_auditoria`.
    await tx
      .update(usuario)
      .set({ estadoCuenta: 'ACTIVA', motivoSuspension: null })
      .where(eq(usuario.id, usuarioId));
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'usuario',
    objetoAfectadoId: usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { estadoCuenta: 'ACTIVA' },
  });
}

/** US-GURP-09 - Baja logica desde el panel. */
export async function eliminarUsuarioPanel(entrada: {
  usuarioId: string;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { usuarioId } = entrada;

  await db.transaction(async (tx) => {
    const actual = await leerEstadoActual(tx, usuarioId);
    if (dejaDeSerAdministradorActivo(actual)) {
      await verificarQuedaOtroAdministrador(tx, usuarioId);
    }
    await tx
      .update(usuario)
      .set({ estadoCuenta: 'ELIMINADA' })
      .where(eq(usuario.id, usuarioId));

    // US-MSG-07 - Misma regla que en la baja propia: las conversaciones del
    // usuario quedan bloqueadas y archivadas del lado de quien sigue en la
    // plataforma, dentro de la misma transaccion que la baja.
    await bloquearConversacionesPorBaja(tx, usuarioId);
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'BAJA',
    tipoObjeto: 'usuario',
    objetoAfectadoId: usuarioId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { motivo: 'baja desde el panel de administración' },
  });
}
