import { eq } from 'drizzle-orm';
import { cocinero, preferenciaNotificacion, usuario } from '@foodhub/db';
import {
  MENSAJES_AUTH,
  preferenciasIniciales,
  type PerfilUsuario,
  type RegistroClienteInput,
  type RegistroCocineroInput,
  type TipoUsuario,
} from '@foodhub/shared';
import { env } from '../../config/env.js';
import { db } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import {
  conCompensacionDeCuenta,
  crearClienteAnonimo,
  esCorreoYaRegistrado,
  supabaseAdmin,
} from '../../lib/supabase.js';
import { AppError } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';
import { aPerfilUsuario } from '../usuarios/usuarios.service.js';

/**
 * Modulo de Autenticacion y Control de Acceso (US-AUT-01, US-AUT-02, US-AUT-04).
 *
 * POR QUE EL REGISTRO PASA POR LA API Y NO POR `signUp` DEL SDK
 *
 * La cuenta de GoTrue y la fila de `usuario` se crean en una sola operacion,
 * con la service role key. Un `signUp` desde el cliente crea la credencial y
 * despues el cliente tendria que crear el perfil: si esa segunda llamada falla
 * (la app se cierra, se corta la red), queda una cuenta de autenticacion sin
 * perfil, imposible de usar e imposible de volver a registrar. Ademas, hacerlo
 * del lado del servidor es lo unico que permite auditar el alta.
 *
 * El login y el cierre de sesion NO tienen endpoint: los resuelve el SDK de
 * Supabase contra GoTrue. La API solo participa despues, verificando el token.
 */

/** Datos comunes a los dos formularios de registro. */
function camposComunes(datos: RegistroClienteInput) {
  return {
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    fotoPerfilUrl: datos.fotoPerfilUrl ?? null,
    // El schema exige `terminosAceptados: true`, asi que llegar hasta aca ya
    // implica la aceptacion. Se sella la fecha porque es el dato que hace
    // oponible la aceptacion ante un reclamo posterior (US-AUT-01, US-AUT-02).
    terminosAceptados: true,
    fechaAceptacionTerminos: new Date(),
  };
}

/**
 * Chequeo previo contra la tabla `usuario`.
 *
 * GoTrue es la fuente de verdad y rechaza igual el correo repetido, pero este
 * chequeo evita crear una credencial que se va a tener que borrar y, sobre
 * todo, garantiza el literal exacto del criterio de aceptacion, que es distinto
 * para el cliente y para el cocinero.
 */
async function verificarCorreoDisponible(
  email: string,
  mensaje: string,
): Promise<void> {
  const [existente] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.email, email))
    .limit(1);

  if (existente) throw new AppError(409, mensaje, 'CORREO_DUPLICADO');
}

/**
 * Crea la credencial en GoTrue y devuelve el id que emitio.
 *
 * `email_confirm: true` es obligatorio: el criterio de aceptacion de US-AUT-01
 * exige que el registro inicie sesion automaticamente y lleve al feed, y eso es
 * imposible si Supabase deja la cuenta pendiente de confirmacion por correo.
 */
async function crearCuentaEnGoTrue(entrada: {
  email: string;
  password: string;
  mensajeCorreoDuplicado: string;
}): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: entrada.email,
    password: entrada.password,
    email_confirm: true,
  });

  if (error) {
    if (esCorreoYaRegistrado(error)) {
      throw new AppError(
        409,
        entrada.mensajeCorreoDuplicado,
        'CORREO_DUPLICADO',
      );
    }
    throw error;
  }

  return data.user.id;
}

/**
 * US-CFG-05 (RF059) - Filas de `preferencia_notificacion` a insertar para el
 * usuario recién creado, con todas las notificaciones activas por defecto.
 * Van en la misma transacción que el alta: un usuario sin preferencias no
 * puede distinguir un aviso esencial de uno que sí puede apagar.
 */
function filasDePreferencias(usuarioId: string, tipoUsuario: TipoUsuario) {
  return preferenciasIniciales(tipoUsuario).map((fila) => ({
    usuarioId,
    tipoNotificacion: fila.tipoNotificacion,
    activa: true,
    modificable: fila.modificable,
  }));
}

function auditarAlta(perfil: PerfilUsuario, ipOrigen: string | null): void {
  void registrarOperacion({
    usuarioId: perfil.id,
    operacion: 'ALTA',
    tipoObjeto: 'usuario',
    objetoAfectadoId: perfil.id,
    ipOrigen,
    datosAdicionales: { email: perfil.email, tipo: perfil.tipo },
  });
}

/** US-AUT-01 - Registro de cliente. PAN-AUT-01. */
export async function registrarCliente(entrada: {
  datos: RegistroClienteInput;
  ipOrigen: string | null;
}): Promise<PerfilUsuario> {
  const { datos } = entrada;
  await verificarCorreoDisponible(
    datos.email,
    MENSAJES_AUTH.correoDuplicadoCliente,
  );

  const idCuenta = await crearCuentaEnGoTrue({
    email: datos.email,
    password: datos.password,
    mensajeCorreoDuplicado: MENSAJES_AUTH.correoDuplicadoCliente,
  });

  const perfil = await conCompensacionDeCuenta(idCuenta, () =>
    // El alta y las preferencias de notificación van en una transacción: un
    // cliente sin ellas no puede distinguir un aviso esencial de uno que sí
    // puede apagar (US-CFG-05).
    db.transaction(async (tx) => {
      const [fila] = await tx
        .insert(usuario)
        .values({ id: idCuenta, ...camposComunes(datos), tipo: 'CLIENTE' })
        .returning();

      if (!fila) throw new Error('el alta del perfil no devolvió ninguna fila');

      await tx
        .insert(preferenciaNotificacion)
        .values(filasDePreferencias(idCuenta, 'CLIENTE'));

      return aPerfilUsuario(fila, null);
    }),
  );

  auditarAlta(perfil, entrada.ipOrigen);
  return perfil;
}

/** US-AUT-02 - Registro de cocinero. PAN-AUT-02. */
export async function registrarCocinero(entrada: {
  datos: RegistroCocineroInput;
  ipOrigen: string | null;
}): Promise<PerfilUsuario> {
  const { datos } = entrada;
  await verificarCorreoDisponible(
    datos.email,
    MENSAJES_AUTH.correoDuplicadoCocinero,
  );

  const idCuenta = await crearCuentaEnGoTrue({
    email: datos.email,
    password: datos.password,
    mensajeCorreoDuplicado: MENSAJES_AUTH.correoDuplicadoCocinero,
  });

  const descripcionPublica = datos.descripcionPublica ?? null;

  const perfil = await conCompensacionDeCuenta(idCuenta, () =>
    // Las dos filas van en una transaccion: un cocinero sin fila en `cocinero`
    // no puede completar su descripcion publica desde ninguna pantalla.
    db.transaction(async (tx) => {
      const [fila] = await tx
        .insert(usuario)
        .values({
          id: idCuenta,
          ...camposComunes(datos),
          tipo: 'COCINERO',
          // PostGIS ordena el punto como (x = lng, y = lat). Invertirlos ubica
          // al cocinero en otro continente sin que falle ninguna validacion.
          ubicacion: { x: datos.ubicacion.lng, y: datos.ubicacion.lat },
        })
        .returning();

      if (!fila) throw new Error('el alta del perfil no devolvió ninguna fila');

      await tx.insert(cocinero).values({
        usuarioId: idCuenta,
        descripcionPublica,
      });

      await tx
        .insert(preferenciaNotificacion)
        .values(filasDePreferencias(idCuenta, 'COCINERO'));

      return aPerfilUsuario(fila, descripcionPublica);
    }),
  );

  auditarAlta(perfil, entrada.ipOrigen);
  return perfil;
}

/**
 * A donde lleva el enlace del correo de recuperacion, segun quien lo pidio.
 *
 * Es el mismo criterio que ya usa `DESTINO_INVITACION` en usuarios.service.ts y
 * por el mismo motivo: cada rol tiene una sola interfaz y el enlace tiene que
 * caer en la que esa persona realmente usa. El cliente y el cocinero solo tienen
 * la app movil (alcance: "una aplicacion movil como plataforma principal, junto
 * a un panel web destinado exclusivamente a las tareas de administracion"). El
 * administrador solo tiene el panel: mandarle un deep link `foodhub://` lo
 * obligaria a instalar una app que no usa, y en una computadora ese enlace no
 * abre nada porque ningun navegador tiene registrado ese esquema.
 *
 * El destino del administrador es la misma pantalla que ya recibe su invitacion
 * (`/nueva-password` del panel): en los dos casos llega con una sesion abierta
 * por GoTrue y sin contrasena propia, que es exactamente lo que esa pantalla
 * resuelve.
 */
const DESTINO_RECUPERACION: Record<TipoUsuario, string> = {
  CLIENTE: env.URL_RECUPERACION_PASSWORD,
  COCINERO: env.URL_RECUPERACION_PASSWORD,
  ADMINISTRADOR: env.URL_INVITACION_PANEL,
};

/**
 * US-AUT-04 - Solicitud del enlace de recuperacion. PAN-AUT-04.
 *
 * DECISION CONSCIENTE DEL EQUIPO: este endpoint revela si un correo tiene
 * cuenta, lo que habilita enumerar usuarios registrados. Se implementa asi
 * porque es el criterio de aceptacion textual de US-AUT-04. La mitigacion es el
 * rate limit estricto del router y el registro de cada consulta.
 *
 * El envio del correo lo hace GoTrue: la API no conoce ni genera el token de
 * recuperacion, solo dispara el flujo.
 */
export async function solicitarRecuperacion(entrada: {
  email: string;
  ipOrigen: string | null;
}): Promise<{ mensaje: string }> {
  const [cuenta] = await db
    .select({ id: usuario.id, tipo: usuario.tipo })
    .from(usuario)
    .where(eq(usuario.email, entrada.email))
    .limit(1);

  if (!cuenta) {
    throw new AppError(
      404,
      MENSAJES_AUTH.correoNoRegistrado,
      'CORREO_NO_REGISTRADO',
    );
  }

  const cliente = crearClienteAnonimo();
  /**
   * Sin `redirectTo`, GoTrue manda el enlace a la Site URL del proyecto y el
   * correo termina en una pagina web generica: el usuario nunca llega a
   * PAN-AUT-04.1 y el ultimo criterio de US-AUT-04 queda sin cumplir.
   */
  const { error } = await cliente.auth.resetPasswordForEmail(entrada.email, {
    redirectTo: DESTINO_RECUPERACION[cuenta.tipo],
  });
  if (error) throw error;

  // Se registra el id y la IP, nunca el correo: los logs se conservan mas
  // tiempo que las sesiones y son accesibles a mas gente que la base.
  logger.info(
    { usuarioId: cuenta.id, ip: entrada.ipOrigen },
    'solicitud de recuperación de contraseña',
  );

  return { mensaje: MENSAJES_AUTH.enlaceRecuperacionEnviado };
}
