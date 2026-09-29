import { ESTADO_PEDIDO, type MetricasAdmin } from '@foodhub/shared';
import { InsigniaEstadoPedido } from '../../components/InsigniasDelDominio.js';
import { formatearNumero } from '../../lib/formato.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';

/**
 * "Total de pedidos realizados y cantidad de pedidos por estado" — primer
 * criterio de US-ADM-05, que el mockup no dibuja (decisión del equipo:
 * sumarlo). Una fila por estado con su insignia, el número y una barra fina
 * de proporción; la insignia ya trae el texto, así que el color no es el
 * único canal.
 */
export function PedidosPorEstado({
  pedidos,
}: {
  pedidos: MetricasAdmin['pedidos'];
}) {
  return (
    <div>
      <p className="text-body text-text-secondary">
        {TEXTOS_METRICAS.pedidosRealizados}
      </p>
      <p className="text-h1 font-extrabold text-text-primary tabular-nums">
        {formatearNumero(pedidos.total)}
      </p>

      <ul className="mt-4 space-y-3">
        {ESTADO_PEDIDO.map((estado) => {
          const cantidad = pedidos.porEstado[estado];
          const proporcion =
            pedidos.total > 0 ? (cantidad / pedidos.total) * 100 : 0;

          return (
            <li className="space-y-1.5" key={estado}>
              <div className="flex items-center justify-between gap-3">
                <InsigniaEstadoPedido estado={estado} />
                <span className="font-bold text-text-primary tabular-nums">
                  {formatearNumero(cantidad)}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-background"
              >
                <div
                  className="h-full rounded-full bg-text-disabled"
                  style={{ width: `${String(proporcion)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
