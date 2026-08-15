import { Table } from '@heroui/react';
import type { EventoSeguridad } from '@foodhub/shared';
import { InsigniaEventoSeguridad } from '../../components/InsigniasDelDominio.js';
import { formatearFechaHora } from '../../lib/formato.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';

/**
 * Tabla de `evento_seguridad` — US-AUD-01.
 *
 * Las columnas no coinciden con las de la solapa de operaciones y por eso son
 * dos tablas: acá interesa el correo intentado y el recurso solicitado, que en
 * un registro de auditoría de negocio no existen.
 */
export function TablaDeSeguridad({
  eventos,
  alElegir,
}: {
  eventos: readonly EventoSeguridad[];
  alElegir: (evento: EventoSeguridad) => void;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS_AUDITORIA.solapaSeguridad}
          className="min-w-[1100px]"
          onRowAction={(clave) => {
            const evento = eventos.find((fila) => fila.id === clave);
            if (evento) alElegir(evento);
          }}
        >
          <Table.Header>
            <Table.Column isRowHeader>
              {TEXTOS_AUDITORIA.columnaFechaHora}
            </Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaTipoEvento}</Table.Column>
            <Table.Column>
              {TEXTOS_AUDITORIA.columnaCorreoIntentado}
            </Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaRecurso}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaIp}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaMotivo}</Table.Column>
          </Table.Header>

          <Table.Body>
            {eventos.map((evento) => (
              <Table.Row
                className="aparece-fila cursor-pointer"
                id={evento.id}
                key={evento.id}
              >
                <Table.Cell>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatearFechaHora(evento.fechaHora)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <InsigniaEventoSeguridad tipo={evento.tipoEvento} />
                </Table.Cell>
                <Table.Cell>
                  <span className="text-text-secondary">
                    {evento.emailIntentado ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption text-text-secondary">
                    {evento.recursoSolicitado ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption text-text-secondary">
                    {evento.ipOrigen ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-text-secondary">
                    {evento.motivo ?? '—'}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
