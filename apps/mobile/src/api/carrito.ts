import type {
  AgregarAlCarritoRespuesta,
  CarritoRespuesta,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Carrito del cliente — US-EXP-07 · PAN-PED-01.
 *
 * Ninguna ruta recibe el id del carrito: hay uno solo por cliente
 * (`carrito_cliente_uq`) y el cliente sale de la sesión. El único id que viaja
 * es el del ítem.
 */

/** US-EXP-07. Carrito vigente, ya depurado de platos no disponibles. */
export function obtenerCarrito(): Promise<CarritoRespuesta> {
  return api.obtener<CarritoRespuesta>('/carrito');
}

/**
 * US-EXP-05. Agrega un plato al carrito, o le suma 1 si ya estaba.
 *
 * `reemplazarCarrito` implementa la confirmación del cuarto criterio: la
 * primera llamada va sin la bandera y, si el carrito es de otro cocinero, la API
 * responde 409 `CARRITO_DE_OTRO_COCINERO`. La pantalla muestra el diálogo y solo
 * si el cliente confirma repite la llamada con `true`.
 */
export function agregarAlCarrito(
  publicacionId: string,
  reemplazarCarrito = false,
): Promise<AgregarAlCarritoRespuesta> {
  return api.enviar<AgregarAlCarritoRespuesta>('/carrito/items', {
    publicacionId,
    reemplazarCarrito,
  });
}

/** US-EXP-07. Botones "+" y "−" de un ítem. */
export function cambiarCantidadItem(
  itemId: string,
  cantidad: number,
): Promise<CarritoRespuesta> {
  return api.modificar<CarritoRespuesta>(`/carrito/items/${itemId}`, {
    cantidad,
  });
}

/** US-EXP-07. Botón "x", o "−" con cantidad 1. */
export function quitarItem(itemId: string): Promise<CarritoRespuesta> {
  return api.eliminar<CarritoRespuesta>(`/carrito/items/${itemId}`);
}

/** US-EXP-07. Botón "Vaciar carrito". */
export function vaciarCarrito(): Promise<CarritoRespuesta> {
  return api.eliminar<CarritoRespuesta>('/carrito');
}
