import type { SolicitarUrlDeCargaInput, UrlDeCarga } from '@foodhub/shared';
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
