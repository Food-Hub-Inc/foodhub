import { and, eq, gte, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  favoritoCocinero,
  itemPedido,
  notificacion,
  pedido,
  usuario,
} from '@foodhub/db';
import {
  MENSAJES_NOTIFICACION,
  type EstadoPedido,
  type OrigenTransicion,
  type TipoNotificacion,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import {
  emitirNotificacion,
  emitirNotificacionEnLote,
} from './emision.service.js';
import { estaViendoConversacion } from './presencia.service.js';

/**
 * Disparadores de notificaciones (US-NOT-01, US-NOT-02, US-NOT-06).
 *
 * Cada funcion la llama el modulo que origina el evento -pedidos, mensajeria,
 * publicaciones- y aca se resuelve TODO lo propio de la notificacion: a quien
 * va, con que texto (siempre desde `MENSAJES_NOTIFICACION`, que es lo que
 * verifica la Etapa 6) y con que `objetoAfectadoId` para el deep link.
 *
 * Los disparadores LEEN de las tablas de otros modulos para armar el mensaje,
 * pero nunca escriben en ellas: ese acoplamiento de solo lectura vive contenido
 * en este archivo, igual que `auditoria.service.ts` es el unico que sabe como
 * se arma un registro de auditoria.
 *
 * NINGUNA lanza: un fallo al emitir una notificacion no puede tumbar la
 * operacion que la genero. Cuando reciben la transaccion del disparador
 * (`cx`), la fila de `notificacion` es atomica con el evento; si esa insercion
 * fallara, es un bug de schema y que reviente el test es lo correcto.
 */

/** Conexion dentro de una transaccion de Drizzle. */
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Ejecutor = Transaccion | typeof db;

function nombreCompleto(nombre: string, apellido: string): string {
  return `${nombre} ${apellido}`;
}

// ---------------------------------------------------------------------------
// US-NOT-01 - Ciclo de vida del pedido
// ---------------------------------------------------------------------------

const cliente = alias(usuario, 'cliente_notif');
const cocinero = alias(usuario, 'cocinero_notif');

/** Datos del pedido que necesitan los textos de US-NOT-01. */
async function datosDelPedido(cx: Ejecutor, pedidoId: string) {
  const [cabecera] = await cx
    .select({
      numeroPedido: pedido.numeroPedido,
      clienteId: pedido.clientePedidoId,
      cocineroId: pedido.cocineroPedidoId,
      clienteNombre: cliente.nombre,
      clienteApellido: cliente.apellido,
      cocineroNombre: cocinero.nombre,
      cocineroApellido: cocinero.apellido,
    })
    .from(pedido)
    .innerJoin(cliente, eq(cliente.id, pedido.clientePedidoId))
    .innerJoin(cocinero, eq(cocinero.id, pedido.cocineroPedidoId))
    .where(eq(pedido.id, pedidoId))
    .limit(1);

  if (!cabecera) return null;

  // Un plato del pedido para el "[Nombre del plato]" que piden algunos textos.
  // `item_pedido` no tiene columna de orden: se toma cualquiera (el criterio lo
  // pide en singular). El snapshot esta congelado, asi que no depende de que la
  // publicacion siga existiendo.
  const [item] = await cx
    .select({ nombre: itemPedido.nombrePlatoSnapshot })
    .from(itemPedido)
    .where(eq(itemPedido.pedidoId, pedidoId))
    .limit(1);

  return { ...cabecera, nombrePlato: item?.nombre ?? 'Tu plato' };
}

/**
 * US-NOT-01 - Un cliente confirmo un pedido nuevo -> al COCINERO. Se llama
 * dentro de la transaccion de `confirmarPedido`.
 */
export async function notificarNuevoPedido(
  cx: Ejecutor,
  pedidoId: string,
): Promise<void> {
  const datos = await datosDelPedido(cx, pedidoId);
  if (!datos) return;

  const { titulo, cuerpo } = MENSAJES_NOTIFICACION.pedidoCreado(
    datos.nombrePlato,
    nombreCompleto(datos.clienteNombre, datos.clienteApellido),
    datos.numeroPedido,
  );

  await emitirNotificacion(
    {
      usuarioDestinoId: datos.cocineroId,
      tipo: 'PEDIDO_CREADO',
      titulo,
      cuerpo,
      objetoAfectadoId: pedidoId,
    },
    cx,
  );
}

interface TransicionNotificable {
  pedidoId: string;
  destino: EstadoPedido;
  origen: OrigenTransicion;
}

interface DatosTextoTransicion {
  clienteId: string;
  cocineroId: string;
  numeroPedido: string;
  nombrePlato: string;
  cocineroNombre: string;
}

interface PlanDeNotificacion {
  destinatario: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
}

/**
 * Funcion PURA: dado el destino y el origen de una transicion, decide a QUIEN
 * se notifica y con QUE texto (US-NOT-01). Se prueba sin base.
 *
 *   ACEPTADO / LISTO / COMPLETADO            -> al CLIENTE
 *   RECHAZADO + origen COCINERO              -> al CLIENTE  ("rechazado")
 *   RECHAZADO + origen CLIENTE               -> al COCINERO ("canceló su pedido")
 *   RECHAZADO + origen SISTEMA               -> null: lo maneja el planificador
 *   cualquier otra transicion                -> null
 */
export function planDeNotificacionDeTransicion(
  destino: EstadoPedido,
  origen: OrigenTransicion,
  datos: DatosTextoTransicion,
): PlanDeNotificacion | null {
  switch (destino) {
    case 'ACEPTADO': {
      const m = MENSAJES_NOTIFICACION.pedidoAceptado(
        datos.cocineroNombre,
        datos.numeroPedido,
      );
      return { destinatario: datos.clienteId, tipo: 'PEDIDO_ACEPTADO', ...m };
    }
    case 'LISTO': {
      const m = MENSAJES_NOTIFICACION.pedidoListo(datos.numeroPedido);
      return { destinatario: datos.clienteId, tipo: 'PEDIDO_LISTO', ...m };
    }
    case 'COMPLETADO': {
      const m = MENSAJES_NOTIFICACION.pedidoCompletado(datos.numeroPedido);
      return { destinatario: datos.clienteId, tipo: 'PEDIDO_COMPLETADO', ...m };
    }
    case 'RECHAZADO': {
      if (origen === 'SISTEMA') return null;
      if (origen === 'CLIENTE') {
        const m = MENSAJES_NOTIFICACION.pedidoCanceladoPorCliente(
          datos.nombrePlato,
          datos.numeroPedido,
        );
        return {
          destinatario: datos.cocineroId,
          tipo: 'PEDIDO_RECHAZADO',
          ...m,
        };
      }
      const m = MENSAJES_NOTIFICACION.pedidoRechazadoPorCocinero(
        datos.numeroPedido,
      );
      return { destinatario: datos.clienteId, tipo: 'PEDIDO_RECHAZADO', ...m };
    }
    default:
      return null;
  }
}

/**
 * US-NOT-01 - Un pedido cambio de estado -> al CLIENTE o al COCINERO segun el
 * caso. Se llama dentro de la transaccion de `aplicarTransicion`.
 *
 * El caso `RECHAZADO` con origen `SISTEMA` (expiracion automatica) NO pasa por
 * aca: la expiracion corre dentro de PostgreSQL y la API no la observa en el
 * momento. La resuelve `notificarExpiracionesPendientes`, mas abajo.
 */
export async function notificarTransicionPedido(
  cx: Ejecutor,
  transicion: TransicionNotificable,
): Promise<void> {
  const { destino, origen, pedidoId } = transicion;

  // Atajo: si la combinacion no notifica, ni se consulta la base. La expiracion
  // automatica (origen SISTEMA) la maneja el planificador, no este camino.
  const notifica =
    destino === 'ACEPTADO' ||
    destino === 'LISTO' ||
    destino === 'COMPLETADO' ||
    (destino === 'RECHAZADO' && origen !== 'SISTEMA');
  if (!notifica) return;

  const datos = await datosDelPedido(cx, pedidoId);
  if (!datos) return;

  const plan = planDeNotificacionDeTransicion(destino, origen, {
    clienteId: datos.clienteId,
    cocineroId: datos.cocineroId,
    numeroPedido: datos.numeroPedido,
    nombrePlato: datos.nombrePlato,
    cocineroNombre: nombreCompleto(
      datos.cocineroNombre,
      datos.cocineroApellido,
    ),
  });
  if (!plan) return;

  await emitirNotificacion(
    {
      usuarioDestinoId: plan.destinatario,
      tipo: plan.tipo,
      titulo: plan.titulo,
      cuerpo: plan.cuerpo,
      objetoAfectadoId: pedidoId,
    },
    cx,
  );
}

/**
 * US-NOT-01 - Aviso de expiracion automatica (origen SISTEMA), a AMBAS partes.
 *
 * La expiracion corre dentro de PostgreSQL (`expirar_pedidos_sin_respuesta`,
 * migracion 0010), asi que la API no la observa en el momento. En vez de
 * duplicar los textos literales de US-NOT-01 dentro de una funcion SQL -algo
 * que el proyecto evita a proposito (ver el comentario de la 0010)-, el
 * planificador de notificaciones llama a esta funcion en cada barrido: busca
 * los pedidos ya expirados por el sistema que todavia no tienen notificacion y
 * las emite desde `MENSAJES_NOTIFICACION`, como el resto del modulo.
 *
 * "Todavia no notificado" = no existe ninguna fila de `notificacion` con este
 * `objeto_afectado_id` y tipo `PEDIDO_RECHAZADO`. Un pedido llega a RECHAZADO
 * una sola vez, asi que el chequeo es estable. La ventana de 24 h acota la
 * consulta. En multi-instancia hay una ventana de carrera minima -> a lo sumo
 * un aviso duplicado de una expiracion; documentado.
 */
export async function notificarExpiracionesPendientes(): Promise<void> {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sinNotificar = db
    .select({ existe: sql`1` })
    .from(notificacion)
    .where(
      and(
        eq(notificacion.objetoAfectadoId, pedido.id),
        eq(notificacion.tipoNotificacion, 'PEDIDO_RECHAZADO'),
      ),
    );

  const expirados = await db
    .select({ id: pedido.id })
    .from(pedido)
    .where(
      and(
        eq(pedido.estadoPedidoActual, 'RECHAZADO'),
        eq(pedido.origenRechazo, 'SISTEMA'),
        gte(pedido.fechaUltimaTransicion, hace24h),
        notExists(sinNotificar),
      ),
    );

  for (const { id: pedidoId } of expirados) {
    const datos = await datosDelPedido(db, pedidoId);
    if (!datos) continue;

    const alCocinero = MENSAJES_NOTIFICACION.pedidoExpiradoParaCocinero(
      datos.nombrePlato,
      datos.numeroPedido,
    );
    const alCliente = MENSAJES_NOTIFICACION.pedidoExpiradoParaCliente(
      datos.numeroPedido,
    );

    await emitirNotificacion({
      usuarioDestinoId: datos.cocineroId,
      tipo: 'PEDIDO_RECHAZADO',
      titulo: alCocinero.titulo,
      cuerpo: alCocinero.cuerpo,
      objetoAfectadoId: pedidoId,
    });
    await emitirNotificacion({
      usuarioDestinoId: datos.clienteId,
      tipo: 'PEDIDO_RECHAZADO',
      titulo: alCliente.titulo,
      cuerpo: alCliente.cuerpo,
      objetoAfectadoId: pedidoId,
    });
  }
}

// ---------------------------------------------------------------------------
// US-NOT-02 - Mensaje nuevo en el chat
// ---------------------------------------------------------------------------

interface MensajeNotificable {
  conversacionId: string;
  remitenteId: string;
  destinatarioId: string;
  tipo: 'TEXTO' | 'IMAGEN';
  contenido: string | null;
  pieDeImagen: string | null;
}

/**
 * US-NOT-02 - Mensaje nuevo -> al DESTINATARIO. Se llama dentro de la
 * transaccion de `enviarMensaje`.
 *
 * Si el destinatario tiene esa conversacion abierta (`estaViendoConversacion`),
 * la fila se escribe igual -queda en el historial- pero se saltea el push: el
 * mensaje ya le aparece en pantalla por Realtime.
 */
export async function notificarMensajeNuevo(
  cx: Ejecutor,
  datos: MensajeNotificable,
): Promise<void> {
  const [remitente] = await cx
    .select({ nombre: usuario.nombre, apellido: usuario.apellido })
    .from(usuario)
    .where(eq(usuario.id, datos.remitenteId))
    .limit(1);
  if (!remitente) return;

  // El "extracto" para un mensaje de imagen: el pie si lo tiene, o "Foto".
  const texto =
    datos.tipo === 'TEXTO'
      ? (datos.contenido ?? '')
      : (datos.pieDeImagen ?? 'Foto');

  const { titulo, cuerpo } = MENSAJES_NOTIFICACION.mensajeNuevo(
    nombreCompleto(remitente.nombre, remitente.apellido),
    texto,
  );

  await emitirNotificacion(
    {
      usuarioDestinoId: datos.destinatarioId,
      tipo: 'MENSAJE_NUEVO',
      titulo,
      cuerpo,
      // El deep link abre PAN-MSG-02: la ruta de la app es
      // /mensajes/[conversacionId], no el id del mensaje.
      objetoAfectadoId: datos.conversacionId,
    },
    cx,
    {
      omitirPush: estaViendoConversacion(
        datos.destinatarioId,
        datos.conversacionId,
      ),
    },
  );
}

// ---------------------------------------------------------------------------
// US-NOT-06 - Publicacion nueva de un cocinero favorito
// ---------------------------------------------------------------------------

/**
 * US-NOT-06 - Un cocinero publico un plato nuevo -> a cada CLIENTE que lo tiene
 * como favorito. Se llama despues de `crearPublicacion` (no corre en
 * transaccion), con `void`: un fallo del abanico no puede tocar el alta del
 * plato, que ya quedo confirmada.
 */
export async function notificarPublicacionDeFavoritos(datos: {
  cocineroId: string;
  publicacionId: string;
  nombrePlato: string;
  precio: string;
}): Promise<void> {
  try {
    const [autor] = await db
      .select({ nombre: usuario.nombre, apellido: usuario.apellido })
      .from(usuario)
      .where(eq(usuario.id, datos.cocineroId))
      .limit(1);
    if (!autor) return;

    const seguidores = await db
      .select({ clienteId: favoritoCocinero.clienteId })
      .from(favoritoCocinero)
      .where(eq(favoritoCocinero.cocineroId, datos.cocineroId));
    if (seguidores.length === 0) return;

    const { titulo, cuerpo } =
      MENSAJES_NOTIFICACION.publicacionDeCocineroFavorito(
        nombreCompleto(autor.nombre, autor.apellido),
        datos.nombrePlato,
        datos.precio,
      );

    await emitirNotificacionEnLote({
      usuarioDestinoIds: seguidores.map((s) => s.clienteId),
      tipo: 'PUBLICACION_COCINERO_FAVORITO',
      titulo,
      cuerpo,
      objetoAfectadoId: datos.publicacionId,
    });
  } catch (error) {
    logger.error(
      { err: error, publicacionId: datos.publicacionId },
      'no se pudo notificar a los favoritos la publicación nueva',
    );
  }
}
