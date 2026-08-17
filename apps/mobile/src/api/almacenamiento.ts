import type {
  SolicitarUrlDeCargaInput,
  SolicitarUrlDeCargaPlatoInput,
  UrlDeCarga,
} from '@foodhub/shared';
import { api } from '../lib/api';

/**
 * Permiso de escritura sobre Supabase Storage.
 *
 * La API no recibe el archivo: devuelve una URL firmada contra la que el
 * dispositivo sube directo. `token` existe para el registro, que pide esta URL
 * con una sesión que todavía no está abierta en la app (ver `useRegistro`).
 */
export function solicitarUrlDeCargaDeFotoPerfil(
  datos: SolicitarUrlDeCargaInput,
  token?: string,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>('/almacenamiento/foto-perfil', datos, token);
}

/**
 * US-PUB-01 - Permiso de escritura para la foto de un plato.
 *
 * Sin `token` explícito: a diferencia de la foto de perfil, la foto de un
 * plato solo se sube con el cocinero ya con sesión abierta en la app (no hay
 * un flujo de alta previo a la sesión, como el registro).
 */
export function solicitarUrlDeCargaDeFotoPlato(
  datos: SolicitarUrlDeCargaPlatoInput,
): Promise<UrlDeCarga> {
  return api.enviar<UrlDeCarga>('/almacenamiento/foto-plato', datos);
}
