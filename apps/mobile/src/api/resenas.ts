import type {
  CrearResenaInput,
  EditarResenaInput,
  EstadoResenaPersona,
  EstadoResenaPublicacion,
  FiltrosResenas,
  PaginaPedidos,
  PaginaResenas,
  PerfilPublicoCliente,
  ReaccionarInput,
  ReportarResenaInput,
  ReputacionCliente,
  ResenaPublica,
  ResponderResenaInput,
  RespuestaCocinero,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Módulo de Reseñas y Calificaciones — US-RES-01 a US-RES-07.
 *
 * Ninguna función recibe el id del autor: sale de la sesión del lado del
 * servidor. Lo que sí viaja es sobre QUÉ se opina, que es lo único que la
 * pantalla conoce y el servidor no puede adivinar.
 */

/**
 * De quién o de qué son las reseñas que se piden.
 *
 * UN DESCRIPTOR Y NO CUATRO FUNCIONES porque las cuatro pantallas que listan
 * reseñas —el detalle del plato, las dos solapas del perfil del cocinero y el
 * perfil del cliente— comparten el mismo componente, los mismos filtros y el
 * mismo scroll infinito. Lo único que cambia es esto.
 */
export type OrigenDeResenas =
  | { tipo: 'PLATO'; publicacionId: string }
  | { tipo: 'COCINERO'; cocineroId: string }
  | { tipo: 'PLATOS_DEL_COCINERO'; cocineroId: string }
  | { tipo: 'CLIENTE'; clienteId: string };

/** La ruta que sirve cada origen. La URL nombra al objeto reseñado. */
function rutaDe(origen: OrigenDeResenas): string {
  switch (origen.tipo) {
    case 'PLATO':
      return `/resenas/publicaciones/${origen.publicacionId}`;
    case 'COCINERO':
      return `/resenas/cocineros/${origen.cocineroId}/opiniones`;
    case 'PLATOS_DEL_COCINERO':
      return `/resenas/cocineros/${origen.cocineroId}/platos`;
    case 'CLIENTE':
      return `/resenas/clientes/${origen.clienteId}`;
  }
}

// --- US-RES-01 · Reseña de un plato -----------------------------------------

export function crearResena(datos: CrearResenaInput): Promise<ResenaPublica> {
  return api.enviar<ResenaPublica>('/resenas', datos);
}

/** Una reseña puntual: precarga el formulario de edición y el modo solo lectura. */
export function obtenerResena(resenaId: string): Promise<ResenaPublica> {
  return api.obtener<ResenaPublica>(`/resenas/${resenaId}`);
}

export function editarResena(
  resenaId: string,
  datos: EditarResenaInput,
): Promise<ResenaPublica> {
  return api.modificar<ResenaPublica>(`/resenas/${resenaId}`, datos);
}

/**
 * RF031 — Qué botón corresponde sobre cada plato de un pedido.
 *
 * Se piden TODAS las publicaciones del pedido de una vez y no una por una: el
 * detalle dibuja un botón por ítem y una consulta por ítem sería el problema
 * N+1 en la pantalla que el cliente abre después de cada compra.
 */
export function obtenerEstadoDeResenas(
  publicacionIds: readonly string[],
): Promise<{ datos: EstadoResenaPublicacion[] }> {
  const parametros = new URLSearchParams({
    publicaciones: publicacionIds.join(','),
  });
  return api.obtener<{ datos: EstadoResenaPublicacion[] }>(
    `/resenas/estado?${parametros.toString()}`,
  );
}

// --- Listados (US-RES-03, RF019, US-RES-02) ---------------------------------

/**
 * Los filtros viajan como query string. `estrellas` se repite una vez por
 * valor seleccionado (`?estrellas=4&estrellas=5`), que es la forma que el
 * schema compartido acepta tanto para uno como para varios.
 */
export function obtenerResenas(
  origen: OrigenDeResenas,
  filtros: Partial<FiltrosResenas>,
): Promise<PaginaResenas> {
  const parametros = new URLSearchParams();
  if (filtros.orden) parametros.set('orden', filtros.orden);
  if (filtros.soloConFoto) parametros.set('soloConFoto', 'true');
  if (filtros.soloConRespuesta) parametros.set('soloConRespuesta', 'true');
  if (filtros.pagina) parametros.set('pagina', String(filtros.pagina));
  if (filtros.porPagina) parametros.set('porPagina', String(filtros.porPagina));
  for (const estrella of filtros.estrellas ?? []) {
    parametros.append('estrellas', String(estrella));
  }

  return api.obtener<PaginaResenas>(
    `${rutaDe(origen)}?${parametros.toString()}`,
  );
}

// --- US-RES-07 · El cliente reseña al cocinero ------------------------------

/**
 * Qué puede hacer el cliente de la sesión con este cocinero: reseñarlo, editar
 * la reseña que ya le dejó, o nada.
 *
 * ES POR COCINERO Y NO POR PEDIDO. Lo consultan el botón del perfil público y
 * el del detalle del pedido, que desde la corrección del modelo preguntan lo
 * mismo. Trae además la reseña vigente, así el formulario se precarga sin una
 * segunda llamada.
 */
export function obtenerMiResenaDeCocinero(
  cocineroId: string,
): Promise<EstadoResenaPersona> {
  return api.obtener<EstadoResenaPersona>(
    `/resenas/cocineros/${cocineroId}/mi-resena`,
  );
}

/**
 * US-RES-02 — Qué puede hacer el cocinero de la sesión con este cliente.
 *
 * Es la misma pregunta que la de arriba en la otra dirección, y por eso
 * comparten contrato: una sola reseña por par, y lo que cambia es el hito del
 * pedido que la habilita.
 */
export function obtenerMiResenaDeCliente(
  clienteId: string,
): Promise<EstadoResenaPersona> {
  return api.obtener<EstadoResenaPersona>(
    `/resenas/clientes/${clienteId}/mi-resena`,
  );
}

// --- US-RES-02 · El cliente reseñado ----------------------------------------

export function obtenerReputacionDeCliente(
  clienteId: string,
): Promise<ReputacionCliente> {
  return api.obtener<ReputacionCliente>(
    `/resenas/clientes/${clienteId}/reputacion`,
  );
}

/** US-DASH-03 — Ficha del perfil público del cliente, para el cocinero. */
export function obtenerPerfilDeCliente(
  clienteId: string,
): Promise<PerfilPublicoCliente> {
  return api.obtener<PerfilPublicoCliente>(
    `/resenas/clientes/${clienteId}/perfil`,
  );
}

/**
 * US-DASH-03 — Los pedidos que ese cliente le hizo al cocinero de la sesión.
 *
 * Vive acá y no en `api/pedidos.ts` porque su única pantalla es el perfil del
 * cliente; si algún día lo usa otra, se muda.
 */
export function obtenerPedidosConCliente(
  clienteId: string,
  pagina: number,
): Promise<PaginaPedidos> {
  return api.obtener<PaginaPedidos>(
    `/pedidos/con-cliente/${clienteId}?pagina=${String(pagina)}`,
  );
}

// --- US-RES-04, US-RES-05 y US-RES-06 · lo social ---------------------------

/** Marca, cambia o quita la reacción. `tipo: null` desmarca (US-RES-04). */
export function reaccionar(
  resenaId: string,
  datos: ReaccionarInput,
): Promise<void> {
  return api.reemplazar<void>(`/resenas/${resenaId}/reaccion`, datos);
}

/** US-RES-05 — el cocinero responde una reseña de uno de sus platos. */
export function responderResena(
  resenaId: string,
  datos: ResponderResenaInput,
): Promise<RespuestaCocinero> {
  return api.enviar<RespuestaCocinero>(`/resenas/${resenaId}/respuesta`, datos);
}

export function editarRespuesta(
  respuestaId: string,
  datos: ResponderResenaInput,
): Promise<RespuestaCocinero> {
  return api.modificar<RespuestaCocinero>(
    `/resenas/respuestas/${respuestaId}`,
    datos,
  );
}

/** US-RES-06 — reporta una reseña ajena. */
export function reportarResena(
  resenaId: string,
  datos: ReportarResenaInput,
): Promise<{ mensaje: string }> {
  return api.enviar<{ mensaje: string }>(`/resenas/${resenaId}/reporte`, datos);
}

/** US-RES-06 — el autor retira su propia reseña (pasa a ELIMINADA_AUTOR). */
export function eliminarMiResena(resenaId: string): Promise<void> {
  return api.eliminar<void>(`/resenas/${resenaId}`);
}
