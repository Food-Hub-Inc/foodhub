import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { conversacion, mensaje, usuario } from '@foodhub/db';
import {
  MENSAJES_MENSAJERIA,
  type ConversacionDetalle,
  type ConversacionResumen,
  type EnviarMensajeInput,
  type FiltrosConversaciones,
  type HistorialDeMensajesInput,
  type Mensaje,
  type MensajeEnviado,
  type PaginaDeMensajes,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { AppError, noEncontrado } from '../../middleware/error.middleware.js';
import { notificarMensajeNuevo } from '../notificaciones/disparadores.service.js';
import {
  aInterlocutor,
  aMensaje,
  archivadaPropia,
  columnasConversacion,
  columnasMensaje,
  esUsuario1,
  juntarInterlocutor,
  type FilaConversacion,
  type FilaMensaje,
} from './consultas.js';
import { mensajeDeBloqueo, motivoDeBloqueo } from './reglas.js';

/**
 * Modulo de Mensajeria directa (US-MSG-01 a US-MSG-07, RF073 a RF079).
 *
 * TRES REGLAS QUE VALEN PARA TODO EL ARCHIVO
 *
 *   LA PERTENENCIA SE VERIFICA EN EL JOIN, NO EN UN IF. Todas las lecturas
 *       entran por `juntarInterlocutor`, cuyo ON exige que quien pregunta ocupe
 *       una de las dos columnas del par. Cambiar el id de la conversacion en la
 *       URL devuelve 404, nunca el hilo de otra persona, y no hay forma de
 *       escribir una consulta nueva y olvidarse el control.
 *
 *   EL SERVIDOR DECIDE SI SE PUEDE ESCRIBIR. `puedeEnviar` viaja en cada
 *       respuesta para que la pantalla deshabilite el campo, pero eso es una
 *       cortesia: `enviarMensaje` vuelve a evaluar las mismas condiciones y
 *       rechaza el POST igual si llega. Deshabilitar un input no es un control
 *       de acceso.
 *
 *   NADA SE BORRA. Dar de baja una cuenta no elimina conversaciones ni
 *       mensajes: los marca `bloqueada_por_baja` y los archiva del lado de quien
 *       queda (US-MSG-07). El historial tiene que seguir siendo consultable.
 */

/** Conexion dentro de una transaccion de Drizzle. Mismo alias que en Pedidos. */
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Una fila cruda, vista por quien pregunta.
 *
 * El motivo del bloqueo se calcula UNA vez y de ahi salen tanto `puedeEnviar`
 * como `motivoBloqueo`: son la misma decision expresada de dos formas, y
 * calcularlas por separado abre la puerta a que se contradigan.
 */
function aDetalle(fila: FilaConversacion): ConversacionDetalle {
  const interlocutor = aInterlocutor(fila);
  const motivoBloqueo = motivoDeBloqueo(fila.bloqueadaPorBaja, interlocutor);

  return {
    id: fila.id,
    interlocutor,
    noLeidos: fila.noLeidos,
    archivada: fila.archivada,
    bloqueadaPorBaja: fila.bloqueadaPorBaja || interlocutor.eliminado,
    puedeEnviar: motivoBloqueo === null,
    motivoBloqueo,
  };
}

// ---------------------------------------------------------------------------
// Lectura de la conversacion
// ---------------------------------------------------------------------------

/**
 * Una conversacion vista por uno de sus dos participantes.
 *
 * Devuelve `null` en lugar de lanzar porque tiene dos usos con respuestas
 * distintas: el detalle responde 404 y el boton "Mensajes del pedido"
 * (US-MSG-06) necesita distinguir "no existe todavia" de "no te pertenece" sin
 * que ninguno de los dos casos sea un error.
 */
async function leerConversacion(
  usuarioId: string,
  conversacionId: string,
  cx: Transaccion | typeof db = db,
): Promise<FilaConversacion | null> {
  const [fila] = await cx
    .select(columnasConversacion(usuarioId))
    .from(conversacion)
    .innerJoin(usuario, juntarInterlocutor(usuarioId))
    .where(eq(conversacion.id, conversacionId))
    .limit(1);

  return fila ?? null;
}

export async function obtenerConversacion(
  usuarioId: string,
  conversacionId: string,
): Promise<ConversacionDetalle> {
  const fila = await leerConversacion(usuarioId, conversacionId);
  if (!fila) throw noEncontrado('la conversación');
  return aDetalle(fila);
}

/**
 * US-MSG-06 - El hilo con otra persona, SIN crearlo si no existe.
 *
 * Es lo que consulta el boton "Mensajes del pedido" de PAN-PED-03 y PAN-PED-06
 * para saber si tiene que mostrar el contador de no leidos. Abrir la
 * conversacion en ese momento crearia una fila vacia cada vez que alguien mira
 * el seguimiento de un pedido.
 */
export async function obtenerConversacionCon(
  usuarioId: string,
  otroUsuarioId: string,
): Promise<ConversacionDetalle | null> {
  const [fila] = await db
    .select(columnasConversacion(usuarioId))
    .from(conversacion)
    .innerJoin(usuario, juntarInterlocutor(usuarioId))
    .where(eq(usuario.id, otroUsuarioId))
    .limit(1);

  return fila ? aDetalle(fila) : null;
}

// ---------------------------------------------------------------------------
// US-MSG-01 - Iniciar la conversacion
// ---------------------------------------------------------------------------

/**
 * Abre el chat con otra persona. IDEMPOTENTE por definicion del modulo:
 * "Si existe una conversacion previa entre ambos, abra el hilo existente con el
 * historial completo. Si no, cree una nueva."
 *
 * NO NORMALIZA EL ORDEN DEL PAR antes de insertar. El indice
 * `conversacion_par_uq` esta declarado sobre `least/greatest` de los dos UUID,
 * asi que (A,B) y (B,A) colisionan igual: ordenar aca seria una segunda
 * normalizacion, en otro lenguaje, que podria dejar de coincidir con la de la
 * base sin que nadie lo note.
 *
 * EL `ON CONFLICT DO NOTHING` NO ES DECORATIVO. Dos toques rapidos en "Enviar
 * mensaje" -o el cliente y el cocinero abriendo el chat en el mismo segundo-
 * disparan dos INSERT concurrentes; sin el, uno de los dos revienta con una
 * violacion de unicidad que el usuario veria como un error del sistema.
 */
export async function abrirConversacion(
  usuarioId: string,
  destinatarioId: string,
): Promise<ConversacionDetalle> {
  if (usuarioId === destinatarioId) {
    throw new AppError(
      400,
      MENSAJES_MENSAJERIA.destinatarioEliminado,
      'DESTINATARIO_INVALIDO',
    );
  }

  const [destinatario] = await db
    .select({ tipo: usuario.tipo, estadoCuenta: usuario.estadoCuenta })
    .from(usuario)
    .where(eq(usuario.id, destinatarioId))
    .limit(1);

  /**
   * La cuenta inexistente y la dada de baja responden lo MISMO: US-MSG-01 fija
   * "El destinatario ya no forma parte de la plataforma." para el segundo caso,
   * y distinguirlos convertiria el endpoint en un detector de que UUID existen.
   */
  if (!destinatario || destinatario.estadoCuenta === 'ELIMINADA') {
    throw new AppError(
      404,
      MENSAJES_MENSAJERIA.destinatarioEliminado,
      'DESTINATARIO_ELIMINADO',
    );
  }

  /**
   * El administrador no participa del chat. No tiene las pantallas del modulo
   * -PAN-MSG-01 y PAN-MSG-02 son de cliente y cocinero- y su rol en el sistema
   * es moderar, no conversar.
   */
  if (destinatario.tipo === 'ADMINISTRADOR') {
    throw new AppError(
      403,
      MENSAJES_MENSAJERIA.destinatarioEliminado,
      'DESTINATARIO_INVALIDO',
    );
  }

  /**
   * La cuenta SUSPENDIDA no impide abrir el hilo: US-MSG-01 pide mostrar la
   * pantalla con el mensaje y el campo de entrada deshabilitado, no negar el
   * acceso. El bloqueo viaja en `puedeEnviar`.
   */
  const existente = await obtenerConversacionCon(usuarioId, destinatarioId);
  if (existente) return existente;

  await db
    .insert(conversacion)
    .values({ usuario1Id: usuarioId, usuario2Id: destinatarioId })
    .onConflictDoNothing();

  const abierta = await obtenerConversacionCon(usuarioId, destinatarioId);
  if (!abierta) throw noEncontrado('la conversación');
  return abierta;
}

// ---------------------------------------------------------------------------
// US-MSG-04 - Listado de conversaciones
// ---------------------------------------------------------------------------

/**
 * Listado de PAN-MSG-01, ordenado por actividad reciente.
 *
 * LAS CONVERSACIONES SIN NINGUN MENSAJE NO APARECEN. US-MSG-01 crea el hilo al
 * presionar "Enviar mensaje", antes de que se escriba nada; si esa fila entrara
 * al listado, la fila mostraria un "extracto del ultimo mensaje" que no existe y
 * quedaria ocupando el tope de la lista sin actividad alguna. El filtro es
 * `fecha_ultimo_mensaje is not null`, que ademas es lo que ordena.
 *
 * EL ULTIMO MENSAJE SE LEE EN UNA SEGUNDA CONSULTA, con `DISTINCT ON` sobre
 * todas las conversaciones de la pagina, y no con una subconsulta por fila: el
 * listado del cocinero activo puede tener decenas de hilos y una consulta por
 * hilo es el problema N+1 de manual. Es la misma solucion que `leerItemsDePedidos`
 * en el modulo de Pedidos.
 */
export async function listarConversaciones(
  usuarioId: string,
  filtros: FiltrosConversaciones,
): Promise<ConversacionResumen[]> {
  const soloArchivadas = filtros.filtro === 'ARCHIVADAS';

  const condiciones = [
    isNotNull(conversacion.fechaUltimoMensaje),
    eq(archivadaPropia(usuarioId), soloArchivadas),
  ];

  /**
   * US-MSG-04: "Filtre las conversaciones cuyo nombre del interlocutor contenga
   * el texto ingresado, de forma insensible a mayusculas y minusculas."
   *
   * Sobre nombre Y apellido concatenados, porque el criterio habla del "nombre
   * completo" que muestra la fila: buscar "ana perez" tiene que encontrar a Ana
   * Perez, y con dos ILIKE sueltos no lo haria.
   */
  if (filtros.busqueda) {
    condiciones.push(
      sql`${usuario.nombre} || ' ' || ${usuario.apellido} ilike ${`%${filtros.busqueda}%`}`,
    );
  }

  const filas = await db
    .select(columnasConversacion(usuarioId))
    .from(conversacion)
    .innerJoin(usuario, juntarInterlocutor(usuarioId))
    .where(and(...condiciones))
    .orderBy(desc(conversacion.fechaUltimoMensaje));

  if (filas.length === 0) return [];

  const ultimos = await leerUltimosMensajes(filas.map((f) => f.id));

  return filas.flatMap((fila) => {
    const ultimo = ultimos.get(fila.id);
    // Defensivo: `fecha_ultimo_mensaje` no es null, asi que el mensaje existe.
    // Si por algun motivo no estuviera, la fila se omite en lugar de romper la
    // pantalla entera del usuario.
    if (!ultimo) return [];

    const detalle = aDetalle(fila);
    return [
      {
        id: detalle.id,
        interlocutor: detalle.interlocutor,
        ultimoMensaje: ultimo,
        fechaUltimoMensaje: fila.fechaUltimoMensaje!.toISOString(),
        noLeidos: detalle.noLeidos,
        archivada: detalle.archivada,
        bloqueadaPorBaja: detalle.bloqueadaPorBaja,
      },
    ];
  });
}

/** El mensaje mas reciente de cada conversacion, en una sola consulta. */
async function leerUltimosMensajes(
  conversacionIds: string[],
): Promise<Map<string, Mensaje>> {
  const filas = await db
    .selectDistinctOn([mensaje.conversacionId], columnasMensaje)
    .from(mensaje)
    .where(inArray(mensaje.conversacionId, conversacionIds))
    .orderBy(mensaje.conversacionId, desc(mensaje.fechaEnvio));

  return new Map(
    (filas as FilaMensaje[]).map((fila) => [
      fila.conversacionId,
      aMensaje(fila),
    ]),
  );
}

// ---------------------------------------------------------------------------
// US-MSG-05 - Historial
// ---------------------------------------------------------------------------

/**
 * Un bloque del historial, hacia atras en el tiempo.
 *
 * "Cargue los ultimos 50 mensajes y posicione la pantalla en el mensaje mas
 * reciente"; "al hacer scroll hacia arriba, cargue bloques adicionales de forma
 * incremental".
 *
 * SE PIDE UN MENSAJE DE MAS PARA SABER SI HAY MAS. Con `limite + 1`, que la
 * consulta devuelva 51 filas significa que queda al menos una mas; se descarta
 * la sobrante y se responde `hayMas: true`. La alternativa -un COUNT(*) del hilo
 * completo en cada scroll- recorre toda la conversacion para responder un
 * booleano.
 *
 * EL BLOQUE SE INVIERTE ANTES DE DEVOLVERLO: la consulta lo trae del mas nuevo
 * al mas viejo, que es el orden que sirve el indice, y la pantalla lo dibuja al
 * reves. Invertir 50 elementos en el servidor es gratis; hacerlo en el telefono
 * en cada render, no.
 */
export async function listarMensajes(
  usuarioId: string,
  conversacionId: string,
  paginado: HistorialDeMensajesInput,
): Promise<PaginaDeMensajes> {
  const fila = await leerConversacion(usuarioId, conversacionId);
  if (!fila) throw noEncontrado('la conversación');

  const condiciones = [eq(mensaje.conversacionId, conversacionId)];
  if (paginado.antesDe) {
    condiciones.push(lt(mensaje.fechaEnvio, new Date(paginado.antesDe)));
  }

  const filas = (await db
    .select(columnasMensaje)
    .from(mensaje)
    .where(and(...condiciones))
    .orderBy(desc(mensaje.fechaEnvio))
    .limit(paginado.limite + 1)) as FilaMensaje[];

  const hayMas = filas.length > paginado.limite;
  const bloque = hayMas ? filas.slice(0, paginado.limite) : filas;

  return { mensajes: bloque.reverse().map(aMensaje), hayMas };
}

// ---------------------------------------------------------------------------
// US-MSG-02 y US-MSG-03 - Envio
// ---------------------------------------------------------------------------

/**
 * Escribe un mensaje y actualiza la conversacion en la misma transaccion.
 *
 * LAS DOS ESCRITURAS SON UNA SOLA OPERACION. El mensaje sin el contador
 * incrementado deja al destinatario sin aviso; el contador sin el mensaje deja
 * un "1 no leido" que no lleva a ningun lado. En una transaccion, o pasan las
 * dos o no pasa ninguna.
 *
 * EL DESARCHIVADO ALCANZA A LOS DOS PARTICIPANTES. US-MSG-04 lo fija para quien
 * recibe ("Una conversacion archivada recibe un nuevo mensaje -> retorne
 * automaticamente al listado principal"). Se aplica tambien a quien escribe
 * porque, si no, alguien que archiva un hilo y despues escribe en el pierde de
 * vista la conversacion que acaba de retomar. No aplica a las bloqueadas por
 * baja, que no admiten mensajes nuevos y por lo tanto nunca llegan aca.
 */
export async function enviarMensaje(
  usuarioId: string,
  conversacionId: string,
  datos: EnviarMensajeInput,
): Promise<MensajeEnviado> {
  return db.transaction(async (tx) => {
    const fila = await leerConversacion(usuarioId, conversacionId, tx);
    if (!fila) throw noEncontrado('la conversación');

    const detalle = aDetalle(fila);
    if (detalle.motivoBloqueo) {
      throw new AppError(
        409,
        mensajeDeBloqueo(detalle.motivoBloqueo, detalle.interlocutor),
        detalle.motivoBloqueo === 'BAJA'
          ? 'CONVERSACION_BLOQUEADA'
          : 'DESTINATARIO_SUSPENDIDO',
      );
    }

    const [creado] = await tx
      .insert(mensaje)
      .values(
        datos.tipo === 'TEXTO'
          ? {
              conversacionId,
              remitenteId: usuarioId,
              tipo: 'TEXTO' as const,
              contenido: datos.contenido,
            }
          : {
              conversacionId,
              remitenteId: usuarioId,
              tipo: 'IMAGEN' as const,
              imagenUrl: datos.imagenUrl,
              pieDeImagen: datos.pieDeImagen ?? null,
            },
      )
      .returning(columnasMensaje);

    /**
     * `RETURNING` de un INSERT de una fila siempre devuelve una fila; el tipo de
     * Drizzle es un array y no lo sabe. Se comprueba en lugar de forzarlo: si
     * algun dia un trigger BEFORE INSERT devuelve NULL y saltea la escritura, el
     * fallo se ve aca y no como un `undefined` propagado a la respuesta.
     */
    if (!creado) throw noEncontrado('el mensaje');

    const soyUsuario1 = esUsuario1(usuarioId);

    await tx
      .update(conversacion)
      .set({
        fechaUltimoMensaje: creado.fechaEnvio,
        // El contador que sube es el del OTRO: el remitente ya leyo lo que
        // acaba de escribir.
        mensajesNoLeidosUsuario1: sql`case when ${soyUsuario1} then ${conversacion.mensajesNoLeidosUsuario1} else ${conversacion.mensajesNoLeidosUsuario1} + 1 end`,
        mensajesNoLeidosUsuario2: sql`case when ${soyUsuario1} then ${conversacion.mensajesNoLeidosUsuario2} + 1 else ${conversacion.mensajesNoLeidosUsuario2} end`,
        archivadaUsuario1: false,
        archivadaUsuario2: false,
      })
      .where(eq(conversacion.id, conversacionId));

    const actualizada = await leerConversacion(usuarioId, conversacionId, tx);
    if (!actualizada) throw noEncontrado('la conversación');

    const detalleActualizado = aDetalle(actualizada);

    /**
     * US-NOT-02 - Notificacion al destinatario, dentro de la misma
     * transaccion: la fila de `notificacion` es atomica con el mensaje. Si el
     * destinatario tiene el chat abierto, `notificarMensajeNuevo` escribe la
     * fila igual pero saltea el push (el mensaje ya le llega por Realtime).
     */
    await notificarMensajeNuevo(tx, {
      conversacionId,
      remitenteId: usuarioId,
      destinatarioId: detalleActualizado.interlocutor.id,
      tipo: datos.tipo,
      contenido: datos.tipo === 'TEXTO' ? datos.contenido : null,
      pieDeImagen: datos.tipo === 'IMAGEN' ? (datos.pieDeImagen ?? null) : null,
    });

    return {
      mensaje: aMensaje(creado),
      conversacion: detalleActualizado,
    };
  });
}

// ---------------------------------------------------------------------------
// US-MSG-02 y US-MSG-05 - Acuses
// ---------------------------------------------------------------------------

/**
 * US-MSG-05 - "Marque automaticamente todos los mensajes recibidos como leidos
 * al momento de ingresar y actualice el contador del listado a 0."
 *
 * SOLO LOS RECIBIDOS. El `ne(remitenteId, usuarioId)` es lo que impide que
 * entrar al chat marque como leidos los mensajes PROPIOS: el estado de una
 * burbuja propia lo define el otro, y pisarlo mostraria "Leido" en mensajes que
 * nadie abrio.
 */
export async function marcarLeidos(
  usuarioId: string,
  conversacionId: string,
): Promise<ConversacionDetalle> {
  return db.transaction(async (tx) => {
    const fila = await leerConversacion(usuarioId, conversacionId, tx);
    if (!fila) throw noEncontrado('la conversación');

    await tx
      .update(mensaje)
      .set({ estadoMensaje: 'LEIDO' })
      .where(
        and(
          eq(mensaje.conversacionId, conversacionId),
          ne(mensaje.remitenteId, usuarioId),
          ne(mensaje.estadoMensaje, 'LEIDO'),
        ),
      );

    const soyUsuario1 = esUsuario1(usuarioId);
    await tx
      .update(conversacion)
      .set({
        mensajesNoLeidosUsuario1: sql`case when ${soyUsuario1} then 0 else ${conversacion.mensajesNoLeidosUsuario1} end`,
        mensajesNoLeidosUsuario2: sql`case when ${soyUsuario1} then ${conversacion.mensajesNoLeidosUsuario2} else 0 end`,
      })
      .where(eq(conversacion.id, conversacionId));

    const actualizada = await leerConversacion(usuarioId, conversacionId, tx);
    if (!actualizada) throw noEncontrado('la conversación');
    return aDetalle(actualizada);
  });
}

/**
 * US-MSG-02 - Acuse de entrega: ENVIADO -> ENTREGADO.
 *
 * Lo dispara el DESTINATARIO cuando el mensaje le llego efectivamente al
 * dispositivo por el canal de Realtime (decision del equipo, 2026-08-21). Ni la
 * historia ni RF074 definen el hecho que provoca ese estado, y esta es la unica
 * lectura de "entregado" que el sistema puede verificar de verdad.
 *
 * TRES CONDICIONES EN EL WHERE, LAS TRES NECESARIAS:
 *   - `remitente <> yo`, para que nadie marque como entregados sus propios
 *     mensajes y se autoconfirme el acuse;
 *   - `estado = 'ENVIADO'`, para no pisar hacia atras un mensaje ya LEIDO si el
 *     acuse llega tarde por una reconexion;
 *   - la pertenencia a una conversacion propia, que impide acusar mensajes de
 *     hilos ajenos mandando UUID al azar.
 */
export async function acusarEntrega(
  usuarioId: string,
  mensajeIds: string[],
): Promise<void> {
  const misConversaciones = db
    .select({ id: conversacion.id })
    .from(conversacion)
    .where(
      or(
        eq(conversacion.usuario1Id, usuarioId),
        eq(conversacion.usuario2Id, usuarioId),
      ),
    );

  await db
    .update(mensaje)
    .set({ estadoMensaje: 'ENTREGADO' })
    .where(
      and(
        inArray(mensaje.id, mensajeIds),
        ne(mensaje.remitenteId, usuarioId),
        eq(mensaje.estadoMensaje, 'ENVIADO'),
        inArray(mensaje.conversacionId, misConversaciones),
      ),
    );
}

// ---------------------------------------------------------------------------
// US-MSG-04 - Archivado
// ---------------------------------------------------------------------------

/**
 * Archiva o devuelve al listado principal, SOLO del lado de quien pide.
 *
 * "Contadores de no leidos y flag de archivado por participante": que uno
 * archive no puede sacarle la conversacion de la lista al otro.
 */
export async function cambiarArchivado(
  usuarioId: string,
  conversacionId: string,
  archivada: boolean,
): Promise<ConversacionDetalle> {
  const fila = await leerConversacion(usuarioId, conversacionId);
  if (!fila) throw noEncontrado('la conversación');

  /**
   * US-MSG-07: una conversacion bloqueada por baja "no retorne al listado
   * principal ante nuevos eventos". Desarchivarla a mano seria exactamente eso.
   */
  if (!archivada && (fila.bloqueadaPorBaja || aInterlocutor(fila).eliminado)) {
    throw new AppError(
      409,
      MENSAJES_MENSAJERIA.conversacionBloqueadaPorBaja,
      'CONVERSACION_BLOQUEADA',
    );
  }

  const soyUsuario1 = esUsuario1(usuarioId);
  await db
    .update(conversacion)
    .set({
      archivadaUsuario1: sql`case when ${soyUsuario1} then ${archivada} else ${conversacion.archivadaUsuario1} end`,
      archivadaUsuario2: sql`case when ${soyUsuario1} then ${conversacion.archivadaUsuario2} else ${archivada} end`,
    })
    .where(eq(conversacion.id, conversacionId));

  const actualizada = await leerConversacion(usuarioId, conversacionId);
  if (!actualizada) throw noEncontrado('la conversación');
  return aDetalle(actualizada);
}

// ---------------------------------------------------------------------------
// US-MSG-07 - Baja de una de las partes
// ---------------------------------------------------------------------------

/**
 * Bloquea y archiva las conversaciones de quien se da de baja.
 *
 * "El interlocutor de una conversacion elimina su cuenta o es dado de baja ->
 * traslade automaticamente la conversacion al filtro 'Archivados' y, ante nuevos
 * eventos del sistema, no la retorne al listado principal."
 *
 * SE ARCHIVA DEL LADO DEL QUE QUEDA, no del que se fue: el `case` mira en cual
 * de las dos columnas cayo el usuario dado de baja y toca la del otro. Al que se
 * fue no le queda pantalla donde verlas.
 *
 * Recibe la transaccion por parametro porque las dos bajas -la propia
 * (US-GURP-04) y la del panel (US-GURP-09)- tienen que dejar la cuenta y sus
 * conversaciones en el mismo estado o en ninguno: si el UPDATE de `usuario`
 * confirma y este falla, quedan conversaciones abiertas contra una cuenta que ya
 * no existe.
 */
export async function bloquearConversacionesPorBaja(
  cx: Transaccion | typeof db,
  usuarioId: string,
): Promise<void> {
  await cx
    .update(conversacion)
    .set({
      bloqueadaPorBaja: true,
      archivadaUsuario1: sql`case when ${conversacion.usuario2Id} = ${usuarioId} then true else ${conversacion.archivadaUsuario1} end`,
      archivadaUsuario2: sql`case when ${conversacion.usuario1Id} = ${usuarioId} then true else ${conversacion.archivadaUsuario2} end`,
    })
    .where(
      or(
        eq(conversacion.usuario1Id, usuarioId),
        eq(conversacion.usuario2Id, usuarioId),
      ),
    );
}
