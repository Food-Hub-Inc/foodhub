import {
  CANTIDAD_MAXIMA_POR_PLATO,
  type AgregarAlCarritoRespuesta,
  type Carrito,
  type CarritoRespuesta,
} from '@foodhub/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  agregarAlCarrito,
  cambiarCantidadItem,
  obtenerCarrito,
  quitarItem,
  vaciarCarrito,
} from '../api/carrito';
import { useSesion } from './useSesion';

/**
 * US-EXP-07 · Carrito del cliente.
 *
 * TODA MUTACIÓN DEVUELVE EL CARRITO COMPLETO y se escribe directo en la caché
 * (`onSuccess`), sin invalidar ni volver a pedirlo. La API ya recalculó el total,
 * el rango de tiempo y la depuración de platos no disponibles en la misma
 * respuesta, así que un refetch traería exactamente lo mismo gastando datos
 * móviles.
 *
 * La excepción es el botón "+"/"−", que además actualiza de forma OPTIMISTA: el
 * segundo y el tercer criterio de la historia exigen que la cantidad y el total
 * cambien "de forma inmediata".
 */
export const CLAVE_CARRITO = ['carrito'] as const;

/**
 * Cantidad total de unidades del carrito, para el contador del botón flotante
 * (último criterio de US-EXP-07).
 *
 * Suma las CANTIDADES y no las filas: dos milanesas y un flan son tres cosas en
 * la bolsa, aunque sean dos ítems. Función pura, exportada para poder probarla.
 */
export function cantidadDeItems(carrito: Carrito | null | undefined): number {
  if (!carrito) return 0;
  return carrito.items.reduce((total, item) => total + item.cantidad, 0);
}

/** US-EXP-07 · Carrito vigente, ya depurado por la API. */
export function useCarrito(): UseQueryResult<CarritoRespuesta, Error> {
  const sesion = useSesion((estado) => estado.sesion);

  return useQuery({
    queryKey: CLAVE_CARRITO,
    queryFn: obtenerCarrito,
    enabled: sesion !== null,
  });
}

/**
 * US-EXP-05 · Agregar un plato al carrito.
 *
 * NO navega ni muestra diálogos: solo ejecuta y avisa qué pasó. El 409
 * `CARRITO_DE_OTRO_COCINERO` llega como error y es la pantalla la que decide
 * mostrar la pregunta "¿Querés vaciarlo y comenzar uno nuevo?" y, si el cliente
 * confirma, volver a llamar con `reemplazarCarrito`. Mismo criterio que
 * `useEliminarPublicacion`: la decisión de qué hacer después es de quien llama.
 */
export function useAgregarAlCarrito(): UseMutationResult<
  AgregarAlCarritoRespuesta,
  Error,
  { publicacionId: string; reemplazarCarrito?: boolean }
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ publicacionId, reemplazarCarrito = false }) =>
      agregarAlCarrito(publicacionId, reemplazarCarrito),
    onSuccess: (respuesta) => {
      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, {
        carrito: respuesta.carrito,
        itemsQuitados: respuesta.itemsQuitados,
      });
    },
  });
}

/**
 * Cambios de cantidad de un ítem que todavía no llegaron al servidor.
 *
 * POR QUÉ HACE FALTA UNA COLA Y NO ALCANZA CON MANDAR CADA TOQUE
 * ---------------------------------------------------------------------------
 * El endpoint recibe una cantidad ABSOLUTA y hace un UPDATE ciego, no un
 * incremento. Con quince toques seguidos salían quince PATCH en paralelo y
 * nada garantizaba el orden de llegada: si la respuesta de `cantidad: 5` caía
 * después de la de `cantidad: 7`, el servidor quedaba guardando 5 y la pantalla
 * lo reflejaba. Ese es el "empieza a bajar en vez de sumar".
 *
 * La cola deja UNA request en vuelo por ítem y guarda solo la ÚLTIMA cantidad
 * deseada mientras esa viaja. No es un debounce: el primer toque sale al
 * instante, y los que se acumulan durante el viaje se resuelven en una sola
 * request más con el valor final. El optimismo de la interfaz no se toca, así
 * que el criterio de US-EXP-07 —"actualice el precio total de forma
 * inmediata"— se sigue cumpliendo.
 */
const enVuelo = new Set<string>();
const cantidadPendiente = new Map<string, number>();

/**
 * Manda la cantidad y absorbe los toques que lleguen mientras tanto.
 *
 * Devuelve `null` cuando la llamada se fusionó con una que ya estaba viajando:
 * en ese caso quien la absorbió es el único que va a escribir la respuesta en
 * la caché, y este `mutate` no tiene nada que reportar.
 */
async function enviarCantidad(
  itemId: string,
  cantidad: number,
): Promise<CarritoRespuesta | null> {
  if (enVuelo.has(itemId)) {
    cantidadPendiente.set(itemId, cantidad);
    return null;
  }

  enVuelo.add(itemId);
  try {
    let respuesta = await cambiarCantidadItem(itemId, cantidad);

    for (;;) {
      const siguiente = cantidadPendiente.get(itemId);
      if (siguiente === undefined) return respuesta;
      cantidadPendiente.delete(itemId);
      respuesta = await cambiarCantidadItem(itemId, siguiente);
    }
  } finally {
    // Ante un fallo se descarta lo pendiente: `onError` va a resincronizar
    // contra el servidor y mandar un valor viejo encima sería pelearse con él.
    cantidadPendiente.delete(itemId);
    enVuelo.delete(itemId);
  }
}

/** Cantidad que la caché tiene AHORA para un ítem, o `undefined` si ya no está. */
function cantidadEnCache(
  cliente: QueryClient,
  itemId: string,
): number | undefined {
  const actual = cliente.getQueryData<CarritoRespuesta>(CLAVE_CARRITO);
  return actual?.carrito?.items.find((item) => item.id === itemId)?.cantidad;
}

/**
 * Aplica el "+" o el "−" sobre la caché y recalcula el total.
 *
 * El total se recalcula acá con aritmética de punto flotante -a diferencia del
 * servidor, que lo suma en `numeric`- porque es un valor provisorio que vive
 * milisegundos: la respuesta del PATCH lo reemplaza por el exacto. Sin este
 * cálculo, el precio del pie de pantalla quedaría un instante desfasado de las
 * cantidades de arriba, que es justo lo que el criterio pide evitar.
 */
function conDelta(
  actual: CarritoRespuesta | undefined,
  itemId: string,
  delta: number,
): CarritoRespuesta | undefined {
  if (!actual?.carrito) return actual;

  const items = actual.carrito.items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          cantidad: Math.min(
            CANTIDAD_MAXIMA_POR_PLATO,
            Math.max(1, item.cantidad + delta),
          ),
        }
      : item,
  );
  const total = items.reduce(
    (suma, item) => suma + Number(item.precioUnitario) * item.cantidad,
    0,
  );

  return {
    ...actual,
    carrito: { ...actual.carrito, items, total: total.toFixed(2) },
  };
}

/**
 * US-EXP-07 · Botones "+" y "−" de un ítem.
 *
 * Recibe un DELTA y no una cantidad absoluta: la cantidad de la que hay que
 * partir sale de la caché en el momento del toque, no del prop que se renderizó
 * la última vez. Con toques más rápidos que un frame de React, ese prop está
 * viejo y dos "+" seguidos mandaban dos veces el mismo número.
 */
export function useCambiarCantidad(): UseMutationResult<
  CarritoRespuesta | null,
  Error,
  { itemId: string; delta: number }
> {
  const cliente = useQueryClient();

  return useMutation({
    /**
     * La cantidad que viaja sale de la caché que `onMutate` acaba de dejar al
     * día, así que siempre es la última deseada aunque se hayan encadenado
     * varios toques.
     */
    mutationFn: ({ itemId }) => {
      const cantidad = cantidadEnCache(cliente, itemId);
      return cantidad === undefined
        ? Promise.resolve(null)
        : enviarCantidad(itemId, cantidad);
    },

    onMutate: async ({ itemId, delta }) => {
      await cliente.cancelQueries({ queryKey: CLAVE_CARRITO });
      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, (actual) =>
        conDelta(actual, itemId, delta),
      );
    },

    onError: () => {
      /**
       * No se restaura ningún snapshot: con varios toques encadenados, el
       * "estado previo" de esta mutación es un intermedio optimista y no lo que
       * el servidor tiene guardado. Ante un fallo, la verdad la tiene él.
       */
      void cliente.invalidateQueries({ queryKey: CLAVE_CARRITO });
    },

    onSuccess: (respuesta) => {
      if (respuesta !== null) {
        cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, respuesta);
      }
    },
  });
}

/**
 * US-EXP-07 · Quitar un ítem ("x", o "−" con cantidad 1).
 *
 * Sin optimismo, a diferencia del "+"/"−": la baja pasa por un diálogo de
 * confirmación ("¿Querés quitar este plato del carrito?"), así que el usuario ya
 * esperó una interacción y unos milisegundos más no se perciben. Adelantarse
 * tendría además que decidir si el carrito quedó vacío -y por lo tanto si
 * corresponde el estado vacío de PAN-PED-01.1-, una decisión que el servidor ya
 * resuelve en la respuesta.
 */
export function useQuitarItem(): UseMutationResult<
  CarritoRespuesta,
  Error,
  string
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => quitarItem(itemId),
    onSuccess: (respuesta) => {
      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, respuesta);
    },
  });
}

/** US-EXP-07 · Botón "Vaciar carrito". */
export function useVaciarCarrito(): UseMutationResult<
  CarritoRespuesta,
  Error,
  void
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: () => vaciarCarrito(),
    onSuccess: (respuesta) => {
      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, respuesta);
    },
  });
}
