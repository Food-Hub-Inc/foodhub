import type {
  CalificarClienteInput,
  CrearResenaInput,
  EditarResenaInput,
  EstadoResenaPublicacion,
  FiltrosResenas,
  MiCalificacionCliente,
  PaginaResenas,
  ReputacionCliente,
  ResenaPublica,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Módulo de Reseñas y Calificaciones — US-RES-01 a US-RES-03.
 *
 * Ninguna función recibe el id del autor: el cliente y el cocinero salen de la
 * sesión del lado del servidor. Lo que sí viaja es sobre QUÉ se opina —la
 * publicación o el cliente evaluado—, que es lo único que la pantalla conoce y
 * el servidor no puede adivinar.
 */

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

// --- US-RES-03 · Perfil público del cocinero --------------------------------

/**
 * Los filtros viajan como query string. `estrellas` se repite una vez por
 * valor seleccionado (`?estrellas=4&estrellas=5`), que es la forma que el
 * schema compartido acepta tanto para uno como para varios.
 */
export function obtenerResenasDeCocinero(
  cocineroId: string,
  filtros: Partial<FiltrosResenas>,
): Promise<PaginaResenas> {
  const parametros = new URLSearchParams();
  if (filtros.orden) parametros.set('orden', filtros.orden);
  if (filtros.soloConFoto) parametros.set('soloConFoto', 'true');
  if (filtros.pagina) parametros.set('pagina', String(filtros.pagina));
  if (filtros.porPagina) parametros.set('porPagina', String(filtros.porPagina));
  for (const estrella of filtros.estrellas ?? []) {
    parametros.append('estrellas', String(estrella));
  }

  return api.obtener<PaginaResenas>(
    `/resenas/cocineros/${cocineroId}?${parametros.toString()}`,
  );
}

// --- US-RES-02 · Calificación del cocinero al cliente -----------------------

export function obtenerMiCalificacionDeCliente(
  clienteId: string,
): Promise<MiCalificacionCliente | null> {
  return api.obtener<MiCalificacionCliente | null>(
    `/resenas/clientes/${clienteId}/mi-calificacion`,
  );
}

export function obtenerReputacionDeCliente(
  clienteId: string,
): Promise<ReputacionCliente> {
  return api.obtener<ReputacionCliente>(
    `/resenas/clientes/${clienteId}/reputacion`,
  );
}

/**
 * Alta y edición son la misma llamada: hay una sola calificación por par
 * cocinero-cliente y el endpoint es idempotente. La pantalla no necesita saber
 * si está creando o actualizando; solo cambia la etiqueta del botón.
 */
export function calificarCliente(
  clienteId: string,
  datos: CalificarClienteInput,
): Promise<MiCalificacionCliente> {
  return api.reemplazar<MiCalificacionCliente>(
    `/resenas/clientes/${clienteId}/calificacion`,
    datos,
  );
}
