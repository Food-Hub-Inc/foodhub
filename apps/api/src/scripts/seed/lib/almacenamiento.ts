import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../../config/env.js';
import { supabaseAdmin } from '../../../lib/supabase.js';

/**
 * Carga de las imagenes del dataset en Supabase Storage.
 *
 * POR QUE SE SUBEN Y NO SE APUNTA A UNA URL EXTERNA
 *
 * Las columnas `foto_perfil_url`, `imagen_url` e `imagen_predeterminada_url`
 * guardan URLs publicas de Storage en el sistema real. Si la seed pusiera ahi
 * una direccion de un sitio ajeno, las pantallas andarian igual pero no se
 * estaria ejercitando el camino de verdad: buckets, rutas por usuario y el CDN
 * que sirve las imagenes. Un bug de permisos del bucket no aparecerian hasta
 * produccion.
 *
 * LAS RUTAS IMITAN LAS QUE ARMA LA API (almacenamiento.service.ts):
 *
 *   perfiles/{usuarioId}/{marcaDeTiempo}.png
 *   publicaciones/{cocineroId}/{marcaDeTiempo}.jpg
 *   configuracion/{categoriaId}/{marcaDeTiempo}.jpg
 *   mensajes/{conversacionId}/{marcaDeTiempo}.jpg
 *
 * Asi la limpieza de fotos anteriores y el borrado en cascada que hace la API
 * encuentran los archivos donde esperan encontrarlos.
 */

const CARPETA_IMAGENES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'imagenes',
);

const TIPO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Contador propio en lugar de `Date.now()`.
 *
 * La seed sube decenas de archivos en el mismo milisegundo y `Date.now()`
 * generaria nombres repetidos dentro de una misma carpeta. El contador ademas
 * hace que los nombres sean estables entre corridas, que es lo que permite
 * comparar dos ejecuciones de la seed.
 */
let secuencia = 0;
function nombreDeArchivo(extension: string): string {
  secuencia += 1;
  return `${String(1_756_500_000_000 + secuencia)}${extension}`;
}

export type Bucket =
  'perfiles' | 'publicaciones' | 'configuracion' | 'mensajes';

const NOMBRE_BUCKET: Record<Bucket, string> = {
  perfiles: env.STORAGE_BUCKET_PERFILES,
  publicaciones: env.STORAGE_BUCKET_PUBLICACIONES,
  configuracion: env.STORAGE_BUCKET_CONFIGURACION,
  mensajes: env.STORAGE_BUCKET_MENSAJES,
};

function tipoMimeDe(archivoLocal: string): string {
  const contentType = TIPO_MIME[extname(archivoLocal).toLowerCase()];
  if (!contentType) {
    throw new Error(`No sé qué tipo MIME tiene ${archivoLocal}`);
  }
  return contentType;
}

/**
 * Tipo y tamano reales del archivo, para que `adjunto_ticket` no declare unos
 * metadatos y guarde otra cosa.
 */
export function metadatosDeImagen(archivoLocal: string): {
  tipoMime: string;
  tamanoBytes: number;
} {
  return {
    tipoMime: tipoMimeDe(archivoLocal),
    tamanoBytes: statSync(join(CARPETA_IMAGENES, archivoLocal)).size,
  };
}

export interface SubidaDeImagen {
  bucket: Bucket;
  /** Carpeta dentro del bucket: el id del usuario, del cocinero, etc. */
  carpeta: string;
  /** Ruta relativa a `seed/imagenes`, por ejemplo `platos/empanadas-carne.jpg`. */
  archivoLocal: string;
}

/** Sube un archivo y devuelve su URL publica. */
export async function subirImagen(entrada: SubidaDeImagen): Promise<string> {
  const rutaLocal = join(CARPETA_IMAGENES, entrada.archivoLocal);
  const contenido = await readFile(rutaLocal);
  const extension = extname(entrada.archivoLocal).toLowerCase();
  const contentType = tipoMimeDe(entrada.archivoLocal);

  const ruta = `${entrada.carpeta}/${nombreDeArchivo(extension)}`;
  const bucket = supabaseAdmin.storage.from(NOMBRE_BUCKET[entrada.bucket]);

  const { error } = await bucket.upload(ruta, contenido, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(
      `No se pudo subir ${entrada.archivoLocal} a ${entrada.bucket}/${ruta}: ${error.message}`,
    );
  }

  return bucket.getPublicUrl(ruta).data.publicUrl;
}

type ClienteDeBucket = ReturnType<typeof supabaseAdmin.storage.from>;

/**
 * Rutas de todos los archivos que cuelgan de un prefijo.
 *
 * Storage no expone un "borrar todo" ni un listado recursivo: `list` devuelve
 * solo un nivel, y distingue archivo de carpeta por la presencia de `id`. Se
 * recorre en profundidad porque no todas las rutas del sistema son
 * `{carpeta}/{archivo}`: los adjuntos de ticket cuelgan de `tickets/{id}/`.
 */
async function archivosBajo(
  bucket: ClienteDeBucket,
  prefijo: string,
): Promise<string[]> {
  const { data, error } = await bucket.list(prefijo, { limit: 1000 });
  if (error) throw error;

  const rutas: string[] = [];
  for (const entrada of data ?? []) {
    const ruta = prefijo === '' ? entrada.name : `${prefijo}/${entrada.name}`;
    if (entrada.id) rutas.push(ruta);
    else rutas.push(...(await archivosBajo(bucket, ruta)));
  }
  return rutas;
}

/** Vacia por completo un bucket. Devuelve cuantos archivos borro. */
export async function vaciarBucket(nombre: Bucket): Promise<number> {
  const bucket = supabaseAdmin.storage.from(NOMBRE_BUCKET[nombre]);
  const aBorrar = await archivosBajo(bucket, '');

  if (aBorrar.length === 0) return 0;

  // `remove` acepta hasta unos cientos de rutas por llamada; se trocea para no
  // depender de ese limite.
  for (let i = 0; i < aBorrar.length; i += 100) {
    const { error: errorBorrado } = await bucket.remove(
      aBorrar.slice(i, i + 100),
    );
    if (errorBorrado) throw errorBorrado;
  }
  return aBorrar.length;
}

export const BUCKETS: readonly Bucket[] = [
  'perfiles',
  'publicaciones',
  'configuracion',
  'mensajes',
];
