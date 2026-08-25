import type { InfiniteData } from '@tanstack/react-query';
import type { Mensaje, PaginaDeMensajes } from '@foodhub/shared';

/**
 * Manipulación de la caché del historial de una conversación.
 *
 * Vive aparte de `useChat` porque son transformaciones PURAS sobre la estructura
 * que arma `useInfiniteQuery`, sin nada de React: así se leen sin el ruido de
 * los hooks y `useChat` se queda dentro del límite de líneas por función que
 * fija ESLint.
 *
 * CÓMO ESTÁ ORDENADA LA CACHÉ, QUE ES LO QUE HACE QUE ESTO NO SEA OBVIO
 *
 *   - `pages[0]` es el bloque MÁS NUEVO: es el que trae la primera carga.
 *   - `pages[n]` son bloques cada vez más viejos, porque el scroll hacia arriba
 *     pagina hacia atrás en el tiempo con el cursor `antesDe`.
 *   - DENTRO de cada bloque los mensajes van del más viejo al más nuevo, tal
 *     como los devuelve la API.
 *
 * De ahí que aplanar para la pantalla exija invertir el orden de las páginas
 * pero no el de sus contenidos.
 */

/**
 * El segundo parámetro genérico queda en su valor por defecto (`unknown`) a
 * propósito. `setQueryData` no propaga el tipo del cursor, así que fijarlo acá
 * en `string | null` hace que la caché que devuelve la consulta y la que espera
 * la escritura sean dos tipos incompatibles por un dato que estas funciones no
 * miran: sólo tocan `pages`.
 */
export type HistorialEnCache = InfiniteData<PaginaDeMensajes>;

/** Todos los mensajes cargados, del más viejo al más nuevo. */
export function aplanar(historial: HistorialEnCache | undefined): Mensaje[] {
  if (!historial) return [];
  return [...historial.pages].reverse().flatMap((pagina) => pagina.mensajes);
}

/**
 * Agrega un mensaje recién llegado por Realtime al bloque más nuevo.
 *
 * IGNORA LOS DUPLICADOS. El mismo mensaje llega dos veces cuando lo escribe el
 * propio usuario: una por la respuesta del POST y otra por el INSERT que
 * Realtime replica. Sin este control, la burbuja aparecería dos veces.
 */
export function agregar(
  historial: HistorialEnCache | undefined,
  mensaje: Mensaje,
): HistorialEnCache | undefined {
  if (!historial) return historial;

  const yaEsta = historial.pages.some((pagina) =>
    pagina.mensajes.some((m) => m.id === mensaje.id),
  );
  if (yaEsta) return historial;

  const [masNuevo, ...resto] = historial.pages;
  if (!masNuevo) return historial;

  return {
    ...historial,
    pages: [
      { ...masNuevo, mensajes: [...masNuevo.mensajes, mensaje] },
      ...resto,
    ],
  };
}

/**
 * Reemplaza un mensaje que cambió de estado (ENVIADO → ENTREGADO → LEIDO).
 *
 * Recorre TODAS las páginas y no sólo la más nueva: marcar como leída una
 * conversación con cien mensajes actualiza también los que quedaron varios
 * bloques atrás, y el usuario los ve al hacer scroll hacia arriba.
 */
export function reemplazar(
  historial: HistorialEnCache | undefined,
  mensaje: Mensaje,
): HistorialEnCache | undefined {
  if (!historial) return historial;

  return {
    ...historial,
    pages: historial.pages.map((pagina) => ({
      ...pagina,
      mensajes: pagina.mensajes.map((m) => (m.id === mensaje.id ? mensaje : m)),
    })),
  };
}

/**
 * Cursor del bloque siguiente: la fecha del mensaje MÁS VIEJO ya cargado.
 *
 * `null` cuando no queda nada más atrás, que es como `useInfiniteQuery` entiende
 * "no hay página siguiente".
 */
export function cursorAnterior(ultima: PaginaDeMensajes): string | null {
  if (!ultima.hayMas) return null;
  return ultima.mensajes[0]?.fechaEnvio ?? null;
}
