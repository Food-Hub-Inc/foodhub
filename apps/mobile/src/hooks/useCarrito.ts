import type {
  AgregarAlCarritoRespuesta,
  Carrito,
  CarritoRespuesta,
} from '@foodhub/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
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

/** Estado previo del carrito, para revertir un "+"/"−" que el servidor rechace. */
interface CarritoPrevio {
  previo: CarritoRespuesta | undefined;
}

/**
 * US-EXP-07 · Botones "+" y "−" de un ítem.
 *
 * Actualiza la cantidad Y el total de forma optimista. El total se recalcula acá
 * con aritmética de punto flotante -a diferencia del servidor, que lo suma en
 * `numeric`- porque es un valor provisorio que vive milisegundos: la respuesta
 * del PATCH lo reemplaza por el exacto. Sin este cálculo, el precio del pie de
 * pantalla quedaría un instante desfasado de las cantidades de arriba, que es
 * justo lo que el criterio pide evitar.
 */
export function useCambiarCantidad(): UseMutationResult<
  CarritoRespuesta,
  Error,
  { itemId: string; cantidad: number },
  CarritoPrevio
> {
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, cantidad }) => cambiarCantidadItem(itemId, cantidad),

    onMutate: async ({ itemId, cantidad }) => {
      await cliente.cancelQueries({ queryKey: CLAVE_CARRITO });
      const previo = cliente.getQueryData<CarritoRespuesta>(CLAVE_CARRITO);

      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, (actual) => {
        if (!actual?.carrito) return actual;

        const items = actual.carrito.items.map((item) =>
          item.id === itemId ? { ...item, cantidad } : item,
        );
        const total = items.reduce(
          (suma, item) => suma + Number(item.precioUnitario) * item.cantidad,
          0,
        );

        return {
          ...actual,
          carrito: { ...actual.carrito, items, total: total.toFixed(2) },
        };
      });

      return { previo };
    },

    onError: (_error, _variables, contexto) => {
      cliente.setQueryData(CLAVE_CARRITO, contexto?.previo);
    },

    onSuccess: (respuesta) => {
      cliente.setQueryData<CarritoRespuesta>(CLAVE_CARRITO, respuesta);
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
