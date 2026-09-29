import { useQuery } from '@tanstack/react-query';
import { listarPedidosRecibidos } from '../api/pedidos';
import { useConversaciones } from './useMensajeria';
import { CLAVE_PEDIDOS } from './usePedidos';
import { useSesion } from './useSesion';

/**
 * Números de las insignias de la barra de pestañas.
 *
 * MENSAJES cuenta CONVERSACIONES con algo sin leer, no mensajes: dice a cuántas
 *     personas hay que contestar (decisión del equipo). Reutiliza el listado de
 *     PAN-MSG-01, así que no hay consulta nueva y `useAcuseDeEntrega` ya lo
 *     invalida cada vez que entra un mensaje.
 *
 * PEDIDOS es solo del cocinero y cuenta los pedidos en CREADO, los que esperan
 *     que los acepte o rechace. Se pide UNA fila de la pestaña "Nuevos": lo que
 *     interesa son los `contadores`, que vienen en cualquier página. La clave
 *     cuelga de `['pedidos', 'recibidos']`, así que aceptar o rechazar ya la
 *     invalida por prefijo.
 */
const CLAVE_PEDIDOS_NUEVOS = [
  ...CLAVE_PEDIDOS,
  'recibidos',
  'insignia',
] as const;

/**
 * Cada cuánto se revisa si entró un pedido. Los pedidos no tienen Realtime
 * (ver `usePedidos`), y un pedido nuevo vence solo a los pocos minutos: medio
 * minuto de demora en la insignia no le hace perder ninguno al cocinero.
 */
const REFRESCO_DE_PEDIDOS_NUEVOS_MS = 30_000;

/** Lo que muestra la insignia: nada con cero, "9+" de diez en adelante. */
function textoDeInsignia(cantidad: number): string | undefined {
  if (cantidad <= 0) return undefined;
  return cantidad > 9 ? '9+' : String(cantidad);
}

export function useInsigniaDeMensajes(): string | undefined {
  const consulta = useConversaciones('ACTIVAS', '');
  const conNoLeidos =
    consulta.data?.filter((conversacion) => conversacion.noLeidos > 0).length ??
    0;
  return textoDeInsignia(conNoLeidos);
}

export function useInsigniaDePedidosNuevos(): string | undefined {
  const sesion = useSesion((estado) => estado.sesion);

  const consulta = useQuery({
    queryKey: CLAVE_PEDIDOS_NUEVOS,
    queryFn: () =>
      listarPedidosRecibidos({ pestana: 'NUEVOS', pagina: 1, porPagina: 1 }),
    enabled: sesion !== null,
    refetchInterval: REFRESCO_DE_PEDIDOS_NUEVOS_MS,
  });

  return textoDeInsignia(consulta.data?.contadores.CREADO ?? 0);
}
