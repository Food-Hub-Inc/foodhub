import type {
  PaginaPedidos,
  PedidoDetalle,
  PestanaPedidosCliente,
  PestanaPedidosCocinero,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Pedidos — US-PED-01 a US-PED-09 · PAN-PED-01 a PAN-PED-06.
 *
 * Ninguna ruta recibe el id del cliente ni el del cocinero: la API los saca de
 * la sesión y verifica la pertenencia del pedido en la propia consulta, así que
 * cambiar el id de la URL devuelve 404 y no el pedido de otro.
 *
 * TODAS LAS TRANSICIONES DEVUELVEN EL DETALLE COMPLETO. El hook lo escribe
 * directo en la caché sin volver a pedirlo: la API ya recalculó el estado, la
 * línea de tiempo y el total en la misma respuesta.
 *
 * US-PED-10 (expiración automática) no aparece acá porque no tiene endpoint:
 * corre como proceso periódico dentro de la base con pg_cron.
 */

/** US-PED-01. Confirma el pedido con el contenido del carrito (PAN-PED-01). */
export function confirmarPedido(
  instruccionesCliente?: string,
): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>('/pedidos', { instruccionesCliente });
}

/** US-PED-06. Historial del cliente, por pestaña (PAN-PED-05). */
export function listarMisPedidos(entrada: {
  pestana: PestanaPedidosCliente;
  pagina: number;
}): Promise<PaginaPedidos> {
  const parametros = new URLSearchParams({
    pestana: entrada.pestana,
    pagina: String(entrada.pagina),
  });
  return api.obtener<PaginaPedidos>(`/pedidos?${parametros.toString()}`);
}

/** US-PED-03 y US-PED-08. Bandeja del cocinero, por pestaña (PAN-PED-04). */
export function listarPedidosRecibidos(entrada: {
  pestana: PestanaPedidosCocinero;
  pagina: number;
}): Promise<PaginaPedidos> {
  const parametros = new URLSearchParams({
    pestana: entrada.pestana,
    pagina: String(entrada.pagina),
  });
  return api.obtener<PaginaPedidos>(
    `/pedidos/recibidos?${parametros.toString()}`,
  );
}

/** US-PED-02, US-PED-07 y US-PED-08. Detalle completo, para las dos partes. */
export function obtenerPedido(pedidoId: string): Promise<PedidoDetalle> {
  return api.obtener<PedidoDetalle>(`/pedidos/${pedidoId}`);
}

/** US-PED-03. "Aceptar" con el tiempo comprometido (PAN-PED-04.4). */
export function aceptarPedido(
  pedidoId: string,
  tiempoEstimadoPreparacionMin: number,
): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>(`/pedidos/${pedidoId}/aceptar`, {
    tiempoEstimadoPreparacionMin,
  });
}

/** US-PED-04. "Confirmar rechazo" (PAN-PED-04.5). */
export function rechazarPedido(
  pedidoId: string,
  motivo: { motivoCancelacionId?: string; motivoTexto?: string },
): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>(`/pedidos/${pedidoId}/rechazar`, motivo);
}

/** US-PED-05. Botón "Listo" de la pestaña Preparando (PAN-PED-04.1). */
export function marcarPedidoListo(pedidoId: string): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>(`/pedidos/${pedidoId}/listo`);
}

/** US-PED-05. Botón "Entregado" de la pestaña Listos (PAN-PED-04.2). */
export function completarPedido(pedidoId: string): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>(`/pedidos/${pedidoId}/completar`);
}

/** US-PED-09. "Sí, cancelar" del diálogo de cancelación (PAN-PED-03.0.1). */
export function cancelarPedido(
  pedidoId: string,
  motivo: { motivoCancelacionId?: string; motivoTexto?: string },
): Promise<PedidoDetalle> {
  return api.enviar<PedidoDetalle>(`/pedidos/${pedidoId}/cancelar`, motivo);
}
