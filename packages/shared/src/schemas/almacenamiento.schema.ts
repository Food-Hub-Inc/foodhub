import { z } from 'zod';
import {
  MENSAJES_CONFIGURACION,
  MENSAJES_PUBLICACION,
  MENSAJES_USUARIO,
} from '../constants/mensajes.js';

/**
 * Contrato de la subida de imagenes a Supabase Storage.
 *
 * POR QUE EL ARCHIVO NO VIAJA EN EL BODY
 *
 * La arquitectura del proyecto (factibilidad tecnica, integracion con Supabase
 * Storage) fija que "el backend genera una URL de carga firmada que es
 * entregada al cliente, el cual realiza el upload directamente desde el
 * dispositivo hacia Supabase Storage sin que el archivo deba transitar por el
 * servidor de la API". Por eso `apps/api` limita el body a 1 MB: nunca recibe
 * binarios.
 *
 * La API entonces no valida el archivo, porque no lo ve. Valida lo que el
 * cliente DECLARA sobre el (tipo y tamano) antes de firmar la URL, y lo hace
 * con este schema para que el rechazo llegue antes de gastar la subida.
 */

/**
 * Formatos admitidos por el criterio de aceptacion de US-AUT-01 y US-AUT-02:
 * "Foto de perfil (JPG, PNG o WEBP, maximo 5 MB) - opcional".
 */
export const FORMATOS_IMAGEN_PERFIL = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type FormatoImagenPerfil = (typeof FORMATOS_IMAGEN_PERFIL)[number];

/** Tope del mismo criterio de aceptacion, expresado en bytes. */
export const MAXIMO_IMAGEN_PERFIL_BYTES = 5 * 1024 * 1024;

/**
 * Lo que el dispositivo declara antes de recibir la URL firmada.
 *
 * Los dos campos usan el MISMO mensaje porque el usuario no necesita saber
 * cual de las dos condiciones incumplio: el texto de `imagenInvalida` ya
 * enuncia las dos ("JPG, PNG o WEBP de hasta 5 MB"), que es exactamente lo que
 * pide el cuarto criterio de aceptacion de US-GURP-02.
 */
export const solicitarUrlDeCargaSchema = z.object({
  mimeType: z.enum(FORMATOS_IMAGEN_PERFIL, {
    message: MENSAJES_USUARIO.imagenInvalida,
  }),
  tamano: z
    .number()
    .int()
    .positive(MENSAJES_USUARIO.imagenInvalida)
    .max(MAXIMO_IMAGEN_PERFIL_BYTES, MENSAJES_USUARIO.imagenInvalida),
});

/**
 * Permiso de escritura acotado que devuelve la API.
 *
 * `urlPublica` viaja junto con la URL firmada, y no la arma el cliente, para
 * que el formato de las URLs de Storage quede definido en un solo lugar. El
 * cliente la manda tal cual en el `PATCH /usuarios/yo` que cierra el flujo.
 */
export const urlDeCargaSchema = z.object({
  /** Destino del PUT. Vence a los pocos segundos de emitida. */
  url: z.url(),
  /** Credencial de un solo uso que acompana al PUT. */
  token: z.string().min(1),
  /** Ruta dentro del bucket, util para diagnosticar una subida fallida. */
  ruta: z.string().min(1),
  /** URL definitiva y permanente que se guarda en `usuario.foto_perfil_url`. */
  urlPublica: z.url(),
});

/**
 * Formatos e imagen de categoria (US-CFG-01, RF054): "Imagen representativa
 * [Archivo de imagen] (maximo 2 MB, opcional)". El RF no acota los formatos
 * admitidos, asi que se reutilizan los mismos tres que el resto de la
 * plataforma en lugar de inventar una lista nueva.
 */
export const MAXIMO_IMAGEN_CATEGORIA_BYTES = 2 * 1024 * 1024;

export const solicitarUrlDeCargaCategoriaSchema = z.object({
  mimeType: z.enum(FORMATOS_IMAGEN_PERFIL, {
    message: MENSAJES_CONFIGURACION.imagenCategoriaInvalida,
  }),
  tamano: z
    .number()
    .int()
    .positive(MENSAJES_CONFIGURACION.imagenCategoriaInvalida)
    .max(
      MAXIMO_IMAGEN_CATEGORIA_BYTES,
      MENSAJES_CONFIGURACION.imagenCategoriaInvalida,
    ),
});

export type SolicitarUrlDeCargaInput = z.infer<
  typeof solicitarUrlDeCargaSchema
>;
export type SolicitarUrlDeCargaCategoriaInput = z.infer<
  typeof solicitarUrlDeCargaCategoriaSchema
>;
export type UrlDeCarga = z.infer<typeof urlDeCargaSchema>;

/**
 * US-PUB-01 - "Imagen del plato ... (JPG, PNG o WEBP, máximo 5 MB) — opcional".
 *
 * Mismos valores que `FORMATOS_IMAGEN_PERFIL` / `MAXIMO_IMAGEN_PERFIL_BYTES`
 * hoy, pero son constantes propias: son restricciones de negocio de un
 * criterio de aceptación distinto (US-PUB-01, no US-AUT-01/US-AUT-02), y
 * endurecer el límite de una no debería mover el límite de la otra sin que
 * nadie lo note.
 */
export const FORMATOS_IMAGEN_PLATO = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type FormatoImagenPlato = (typeof FORMATOS_IMAGEN_PLATO)[number];

export const MAXIMO_IMAGEN_PLATO_BYTES = 5 * 1024 * 1024;

/**
 * Lo que el dispositivo declara antes de recibir la URL firmada de la foto de
 * un plato. La respuesta reutiliza `urlDeCargaSchema` tal cual: el shape del
 * permiso de escritura no depende de qué se está subiendo.
 */
export const solicitarUrlDeCargaPlatoSchema = z.object({
  mimeType: z.enum(FORMATOS_IMAGEN_PLATO, {
    message: MENSAJES_PUBLICACION.imagenInvalida,
  }),
  tamano: z
    .number()
    .int()
    .positive(MENSAJES_PUBLICACION.imagenInvalida)
    .max(MAXIMO_IMAGEN_PLATO_BYTES, MENSAJES_PUBLICACION.imagenInvalida),
});

export type SolicitarUrlDeCargaPlatoInput = z.infer<
  typeof solicitarUrlDeCargaPlatoSchema
>;
