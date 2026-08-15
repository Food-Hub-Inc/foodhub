import { Table } from '@heroui/react';
import type { RegistroAuditoria } from '@foodhub/shared';
import { InsigniaOperacion } from '../../components/InsigniasDelDominio.js';
import { formatearFechaHora } from '../../lib/formato.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';

/**
 * Tabla de `registro_auditoria` — US-AUD-02.
 *
 * Las filas son accionables: `onRowAction` abre el modal de detalle. Se resuelve
 * con la API de React Aria y no con un `onClick` sobre el `<tr>` para que la
 * fila quede en el orden de tabulación y Enter la abra igual que el mouse.
 */
export function TablaDeOperaciones({
  registros,
  alElegir,
}: {
  registros: readonly RegistroAuditoria[];
  alElegir: (registro: RegistroAuditoria) => void;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS_AUDITORIA.solapaOperaciones}
          className="min-w-[1040px]"
          onRowAction={(clave) => {
            const registro = registros.find((fila) => fila.id === clave);
            if (registro) alElegir(registro);
          }}
        >
          <Table.Header>
            <Table.Column isRowHeader>
              {TEXTOS_AUDITORIA.columnaFechaHora}
            </Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaEmail}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaObjeto}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaOperacion}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaIp}</Table.Column>
            <Table.Column>{TEXTOS_AUDITORIA.columnaUsuarioId}</Table.Column>
          </Table.Header>

          <Table.Body>
            {registros.map((registro) => (
              <Table.Row
                className="aparece-fila cursor-pointer"
                id={registro.id}
                key={registro.id}
              >
                <Table.Cell>
                  <span className="whitespace-nowrap tabular-nums">
                    {formatearFechaHora(registro.fechaHora)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-text-secondary">
                    {registro.usuarioEmail ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>{registro.tipoObjeto}</Table.Cell>
                <Table.Cell>
                  <InsigniaOperacion operacion={registro.operacion} />
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption text-text-secondary">
                    {registro.ipOrigen ?? '—'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="font-mono text-caption text-text-secondary">
                    {registro.usuarioId ?? '—'}
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
