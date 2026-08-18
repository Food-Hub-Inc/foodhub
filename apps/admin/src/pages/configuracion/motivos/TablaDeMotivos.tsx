import { Button, Table } from '@heroui/react';
import type { MotivoCancelacionListado } from '@foodhub/shared';
import { InsigniaHabilitacion } from '../../../components/InsigniasDelDominio.js';
import {
  IconoEditar,
  IconoExito,
  IconoOcultar,
} from '../../../components/iconos/index.js';
import { ETIQUETA_TIPO_USUARIO_CANCELACION } from '../../../lib/etiquetas.js';
import { formatearNumero } from '../../../lib/formato.js';
import { TEXTOS_MOTIVOS } from '../../../lib/textos.js';

/**
 * Tabla de PAN-ADM-04 (motivos de cancelación) — US-CFG-02: nombre,
 * aplicabilidad, pedidos asociados (acumulado histórico), estado y
 * acciones.
 */
export interface AccionesDeFila {
  editar: (motivo: MotivoCancelacionListado) => void;
  habilitar: (motivo: MotivoCancelacionListado) => void;
  deshabilitar: (motivo: MotivoCancelacionListado) => void;
}

export function TablaDeMotivos({
  motivos,
  acciones,
}: {
  motivos: readonly MotivoCancelacionListado[];
  acciones: AccionesDeFila;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS_MOTIVOS.titulo}
          className="min-w-[820px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>
              {TEXTOS_MOTIVOS.columnaNombre}
            </Table.Column>
            <Table.Column>{TEXTOS_MOTIVOS.columnaAplicabilidad}</Table.Column>
            <Table.Column>{TEXTOS_MOTIVOS.columnaPedidos}</Table.Column>
            <Table.Column>{TEXTOS_MOTIVOS.columnaEstado}</Table.Column>
            <Table.Column>{TEXTOS_MOTIVOS.columnaAcciones}</Table.Column>
          </Table.Header>

          <Table.Body>
            {motivos.map((motivo) => (
              <Table.Row className="aparece-fila" key={motivo.id}>
                <Table.Cell>
                  <span className="font-semibold text-text-primary">
                    {motivo.nombre}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <span className="text-text-secondary">
                    {ETIQUETA_TIPO_USUARIO_CANCELACION[motivo.aplicableA]}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <span className="text-text-secondary">
                    {formatearNumero(motivo.pedidosAsociados)}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <InsigniaHabilitacion
                    activo={motivo.activo}
                    etiquetaDeshabilitado="Deshabilitado"
                    etiquetaHabilitado="Habilitado"
                  />
                </Table.Cell>

                <Table.Cell>
                  <AccionesDeMotivo acciones={acciones} motivo={motivo} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function AccionesDeMotivo({
  motivo,
  acciones,
}: {
  motivo: MotivoCancelacionListado;
  acciones: AccionesDeFila;
}) {
  return (
    <div className="flex items-center gap-1">
      <BotonDeAccion
        alPresionar={() => {
          acciones.editar(motivo);
        }}
        etiqueta={`${TEXTOS_MOTIVOS.accionEditar}: ${motivo.nombre}`}
      >
        <IconoEditar className="size-4.5" />
      </BotonDeAccion>

      {motivo.activo ? (
        <BotonDeAccion
          alPresionar={() => {
            acciones.deshabilitar(motivo);
          }}
          etiqueta={`${TEXTOS_MOTIVOS.accionDeshabilitar}: ${motivo.nombre}`}
        >
          <IconoOcultar className="size-4.5" />
        </BotonDeAccion>
      ) : (
        <BotonDeAccion
          alPresionar={() => {
            acciones.habilitar(motivo);
          }}
          etiqueta={`${TEXTOS_MOTIVOS.accionHabilitar}: ${motivo.nombre}`}
        >
          <IconoExito className="size-4.5" />
        </BotonDeAccion>
      )}
    </div>
  );
}

function BotonDeAccion({
  children,
  etiqueta,
  alPresionar,
}: {
  children: React.ReactNode;
  etiqueta: string;
  alPresionar: () => void;
}) {
  return (
    <Button
      aria-label={etiqueta}
      className="size-9 text-text-secondary transition-colors duration-150 hover:text-primary"
      isIconOnly
      onPress={alPresionar}
      size="sm"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
