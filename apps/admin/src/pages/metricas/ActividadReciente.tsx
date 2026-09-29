import { Link } from 'react-router-dom';
import { Table } from '@heroui/react';
import type { ActividadReciente as Fila } from '@foodhub/shared';
import { InsigniaOperacion } from '../../components/InsigniasDelDominio.js';
import { formatearFechaHora } from '../../lib/formato.js';
import { RUTAS } from '../../lib/rutas.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';

/**
 * "Actividad reciente" del mockup de PAN-ADM-03: las últimas operaciones de
 * `registro_auditoria`, con salida al historial completo (PAN-AUD-01).
 */
export function ActividadReciente({
  filas,
  compacta = false,
}: {
  filas: readonly Fila[];
  /** En el Inicio se omite la columna de detalle. */
  compacta?: boolean;
}) {
  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-h3 font-bold text-text-primary">
          {TEXTOS_METRICAS.actividadReciente}
        </h2>
        <Link
          className="text-body font-semibold text-primary hover:text-primary-dark"
          data-no-imprimir
          to={RUTAS.auditoria}
        >
          {TEXTOS_METRICAS.verHistorial}
        </Link>
      </header>

      {filas.length === 0 ? (
        <p className="px-5 py-6 text-body text-text-secondary">
          {TEXTOS_METRICAS.sinActividad}
        </p>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label={TEXTOS_METRICAS.actividadReciente}>
              <Table.Header>
                <Table.Column isRowHeader>
                  {TEXTOS_METRICAS.columnaAccion}
                </Table.Column>
                <Table.Column>{TEXTOS_METRICAS.columnaUsuario}</Table.Column>
                {compacta ? null : (
                  <Table.Column>{TEXTOS_METRICAS.columnaDetalle}</Table.Column>
                )}
                <Table.Column>{TEXTOS_METRICAS.columnaFecha}</Table.Column>
              </Table.Header>
              <Table.Body>
                {filas.map((fila) => (
                  <Table.Row key={fila.id}>
                    <Table.Cell>
                      <InsigniaOperacion operacion={fila.operacion} />
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-text-secondary">
                        {fila.usuarioEmail ?? TEXTOS_METRICAS.sistema}
                      </span>
                    </Table.Cell>
                    {compacta ? null : (
                      <Table.Cell>
                        <span className="text-text-secondary">
                          {fila.tipoObjeto}
                        </span>
                      </Table.Cell>
                    )}
                    <Table.Cell>
                      <span className="text-text-secondary tabular-nums">
                        {formatearFechaHora(fila.fechaHora)}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </section>
  );
}
