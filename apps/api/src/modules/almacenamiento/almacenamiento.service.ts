import {
  MENSAJES_PUBLICACION,
  MENSAJES_USUARIO,
  type FormatoImagenPerfil,
  type SolicitarUrlDeCargaInput,
  type SolicitarUrlDeCargaPlatoInput,
  type UrlDeCarga,
} from '@foodhub/shared';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * Emision de permisos de escritura sobre Supabase Storage.
 *
 * LA API NUNCA TOCA EL ARCHIVO. Firma una URL de carga acotada y el dispositivo
 * sube contra ella; el binario no pasa por este proceso (por eso el body de la
 * API esta limitado a 1 MB en `app.ts`). Es la decision de arquitectura del
 * punto de factibilidad tecnica del documento de proyecto.
 *
 * POR QUE ESTO NECESITA UN ENDPOINT Y NO LO RESUELVE EL SDK EN EL TELEFONO
 *
 * Para subir directo desde el cliente harian falta politicas RLS sobre
 * `storage.objects` que dejen escribir a cualquier usuario autenticado dentro
 * de su propia carpeta. Firmar del lado del servidor logra lo mismo sin abrir
 * el bucket: la ruta la arma la API a partir de `req.usuario.id`, con lo cual
 * un usuario no puede pisar la foto de otro ni aunque manipule la request.
 */

/** Extension del archivo segun el tipo declarado. Storage no la infiere sola. */
const EXTENSION: Record<FormatoImagenPerfil, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Carpeta propia de cada usuario dentro del bucket de perfiles. */
function carpetaDe(usuarioId: string): string {
  return `${usuarioId}/`;
}

/**
 * US-AUT-01, US-AUT-02 y US-GURP-02 - Permiso para subir la foto de perfil.
 *
 * El tope de tamano se comprueba DE NUEVO aca aunque el schema compartido ya lo
 * haya validado: el schema corre tambien en el telefono, y una validacion que
 * el cliente puede saltear no es un control de acceso. `STORAGE_MAX_FILE_SIZE_MB`
 * es ademas el unico lugar donde el limite se puede ajustar por ambiente sin
 * tocar el criterio de aceptacion, que fija 5 MB.
 */
export async function crearUrlDeCargaDeFotoPerfil(entrada: {
  usuarioId: string;
  datos: SolicitarUrlDeCargaInput;
}): Promise<UrlDeCarga> {
  const topeBytes = env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (entrada.datos.tamano > topeBytes) {
    throw new AppError(400, MENSAJES_USUARIO.imagenInvalida, 'IMAGEN_INVALIDA');
  }

  /**
   * El nombre lleva la marca de tiempo y no es fijo por usuario. Con un nombre
   * fijo la URL no cambiaria al reemplazar la foto y el CDN de Storage —y la
   * cache de expo-image en el dispositivo— seguirian sirviendo la anterior
   * durante horas. La carpeta previa se limpia despues de guardar la URL nueva.
   */
  const extension = EXTENSION[entrada.datos.mimeType];
  const ruta = `${carpetaDe(entrada.usuarioId)}${String(Date.now())}.${extension}`;

  const bucket = supabaseAdmin.storage.from(env.STORAGE_BUCKET_PERFILES);
  const { data, error } = await bucket.createSignedUploadUrl(ruta);
  if (error) throw error;

  return {
    url: data.signedUrl,
    token: data.token,
    ruta: data.path,
    urlPublica: bucket.getPublicUrl(ruta).data.publicUrl,
  };
}

/**
 * Borra las fotos anteriores del usuario y deja solo la vigente.
 *
 * Se invoca DESPUES de que la URL nueva quedo guardada en `usuario`, nunca
 * antes: si se borrara primero y la escritura fallara, el perfil quedaria
 * apuntando a un archivo inexistente.
 *
 * Es "fire and forget" como la auditoria. El plan gratuito de Supabase da 1 GB
 * de Storage y sin esta limpieza cada cambio de foto deja un huerfano, pero un
 * fallo del borrado no puede convertir un guardado exitoso en un error para el
 * usuario: la foto nueva ya esta.
 */
export async function limpiarFotosDePerfilAnteriores(
  usuarioId: string,
  urlVigente: string,
): Promise<void> {
  try {
    const bucket = supabaseAdmin.storage.from(env.STORAGE_BUCKET_PERFILES);
    const { data, error } = await bucket.list(usuarioId);
    if (error) throw error;

    const obsoletas = data
      .filter((archivo) => !urlVigente.endsWith(`/${archivo.name}`))
      .map((archivo) => `${carpetaDe(usuarioId)}${archivo.name}`);

    if (obsoletas.length === 0) return;

    const { error: errorBorrado } = await bucket.remove(obsoletas);
    if (errorBorrado) throw errorBorrado;
  } catch (error) {
    logger.error(
      { err: error, usuarioId },
      'quedaron fotos de perfil huérfanas en Storage',
    );
  }
}

// ---------------------------------------------------------------------------
// Foto de plato (US-PUB-01 y US-PUB-02)
// ---------------------------------------------------------------------------

/** Carpeta del bucket de publicaciones donde caen las fotos de un cocinero. */
function carpetaDePlatosDe(cocineroId: string): string {
  return `${cocineroId}/`;
}

/**
 * US-PUB-01 - Permiso para subir la foto de un plato.
 *
 * Mismo mecanismo que `crearUrlDeCargaDeFotoPerfil` (URL firmada, nombre con
 * marca de tiempo para invalidar la cache de imagen del dispositivo), pero
 * contra `STORAGE_BUCKET_PUBLICACIONES` y con la carpeta nombrada por
 * `cocineroId`, no por el id de la publicación: la foto se sube ANTES de
 * crear la fila (el flujo de alta encadena la subida y recién después el
 * `POST /publicaciones`), así que todavía no existe un id de publicación al
 * que asociar la carpeta.
 *
 * Reutiliza `EXTENSION`: los formatos admitidos de plato y de perfil son hoy
 * el mismo conjunto de tres, y la tabla de extensiones no es una regla de
 * negocio (a diferencia de `FORMATOS_IMAGEN_PLATO` / `MAXIMO_IMAGEN_PLATO_BYTES`,
 * que sí son constantes propias): es un detalle técnico de cómo se nombra el
 * archivo.
 */
export async function crearUrlDeCargaDeFotoPlato(entrada: {
  cocineroId: string;
  datos: SolicitarUrlDeCargaPlatoInput;
}): Promise<UrlDeCarga> {
  const topeBytes = env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (entrada.datos.tamano > topeBytes) {
    throw new AppError(
      400,
      MENSAJES_PUBLICACION.imagenInvalida,
      'IMAGEN_INVALIDA',
    );
  }

  const extension = EXTENSION[entrada.datos.mimeType];
  const ruta = `${carpetaDePlatosDe(entrada.cocineroId)}${String(Date.now())}.${extension}`;

  const bucket = supabaseAdmin.storage.from(env.STORAGE_BUCKET_PUBLICACIONES);
  const { data, error } = await bucket.createSignedUploadUrl(ruta);
  if (error) throw error;

  return {
    url: data.signedUrl,
    token: data.token,
    ruta: data.path,
    urlPublica: bucket.getPublicUrl(ruta).data.publicUrl,
  };
}

/**
 * US-PUB-02 - Borra la foto ANTERIOR de un plato puntual tras editarlo.
 *
 * NO ES el mismo patrón que `limpiarFotosDePerfilAnteriores` a pesar de lo que
 * describía el plan original: esa función lista TODA la carpeta del usuario y
 * borra todo lo que no coincide con la URL vigente, lo cual es correcto para
 * un perfil (una persona, una sola foto activa) pero destructivo para un
 * plato. Un cocinero tiene varias publicaciones a la vez y todas sus fotos
 * conviven en la misma carpeta `${cocineroId}/` del bucket (no hay una
 * subcarpeta por publicación posible: la foto se sube antes de que la
 * publicación tenga id, ver `crearUrlDeCargaDeFotoPlato`). Vaciar la carpeta
 * al editar UN plato borraría también las fotos de los OTROS platos vigentes
 * del mismo cocinero. Por eso esta función recibe la URL anterior puntual del
 * plato que se está editando y borra únicamente ese objeto, dejando intacto
 * el resto de la carpeta.
 *
 * Se invoca solo cuando `imagenUrl` participó de la edición (mismo criterio
 * que `editarPerfil` con `fotoPerfilUrl`), con la URL que tenía la fila ANTES
 * del `UPDATE` y la que quedó guardada después.
 */
export async function limpiarFotoDePlatoAnterior(entrada: {
  cocineroId: string;
  urlAnterior: string | null;
  urlNueva: string | null;
}): Promise<void> {
  const { cocineroId, urlAnterior, urlNueva } = entrada;
  if (!urlAnterior || urlAnterior === urlNueva) return;

  try {
    const nombreArchivo = urlAnterior.split('/').pop();
    if (!nombreArchivo) return;

    const bucket = supabaseAdmin.storage.from(env.STORAGE_BUCKET_PUBLICACIONES);
    const { error } = await bucket.remove([
      `${carpetaDePlatosDe(cocineroId)}${nombreArchivo}`,
    ]);
    if (error) throw error;
  } catch (error) {
    logger.error(
      { err: error, cocineroId },
      'quedó una foto de plato huérfana en Storage',
    );
  }
}
