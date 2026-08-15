import type { ReactNode } from 'react';
import { Button, Modal } from '@heroui/react';
import { ETIQUETA_DATO_ADICIONAL } from '../../lib/etiquetas.js';
import { TEXTOS_AUDITORIA, TEXTOS_FORMULARIO } from '../../lib/textos.js';

/**
 * Modal de detalle de una fila de PAN-AUD-01 — US-AUD-02, quinto criterio.
 *
 * Un registro de auditoría es evidencia: se muestran todos sus campos, incluso
 * los vacíos, con un guion en vez de esconderlos. Que un campo esté en blanco
 * también es información.
 */
export function DetalleDeRegistro({
  alCerrar,
  titulo,
  campos,
  datosAdicionales,
}: {
  alCerrar: () => void;
  titulo: string;
  campos: readonly { etiqueta: string; valor: ReactNode }[];
  /** `datos_adicionales` de la fila. Estructura libre por diseño. */
  datosAdicionales?: unknown;
}) {
  return (
    // El modal se monta solo cuando hay una fila elegida: quien lo usa lo
    // renderiza condicionalmente, así que acá siempre está abierto.
    <Modal.Backdrop
      isOpen
      onOpenChange={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
    >
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{titulo}</Modal.Heading>
          </Modal.Header>

          <Modal.Body>
            <dl className="divide-y divide-border">
              {campos.map((campo) => (
                <ParCampoValor
                  etiqueta={campo.etiqueta}
                  key={campo.etiqueta}
                  valor={campo.valor}
                />
              ))}
            </dl>

            {datosAdicionales === undefined ? null : (
              <section className="mt-6">
                <h3 className="mb-2 text-h3 font-bold text-text-primary">
                  {TEXTOS_AUDITORIA.detalleDatosAdicionales}
                </h3>
                <DatosAdicionales datos={datosAdicionales} />
              </section>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button onPress={alCerrar} variant="secondary">
              {TEXTOS_FORMULARIO.cancelar}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ParCampoValor({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,160px)_1fr] gap-4 py-2.5">
      <dt className="text-label font-semibold text-text-secondary">
        {etiqueta}
      </dt>
      <dd className="min-w-0 text-body break-words text-text-primary">
        {valor}
      </dd>
    </div>
  );
}

/**
 * Renderiza `datos_adicionales` como pares campo/valor.
 *
 * El criterio de aceptación pide "los datos adicionales estructurados", no un
 * volcado de JSON: quien audita necesita leer "Rol anterior: CLIENTE", no
 * `{"tipoAnterior":"CLIENTE"}`. La columna es de estructura libre, así que se
 * contemplan las tres formas que puede tener: un objeto (el caso normal), un
 * valor suelto y la ausencia total.
 */
function DatosAdicionales({ datos }: { datos: unknown }) {
  if (datos === null || datos === undefined) {
    return (
      <p className="text-body text-text-secondary">
        {TEXTOS_AUDITORIA.detalleSinDatosAdicionales}
      </p>
    );
  }

  if (typeof datos !== 'object' || Array.isArray(datos)) {
    return (
      <dl className="divide-y divide-border">
        <ParCampoValor
          etiqueta={TEXTOS_AUDITORIA.detalleDatosAdicionales}
          valor={aTexto(datos)}
        />
      </dl>
    );
  }

  const entradas = Object.entries(datos as Record<string, unknown>);
  if (entradas.length === 0) {
    return (
      <p className="text-body text-text-secondary">
        {TEXTOS_AUDITORIA.detalleSinDatosAdicionales}
      </p>
    );
  }

  return (
    <dl className="divide-y divide-border">
      {entradas.map(([clave, valor]) => (
        <ParCampoValor
          // Una clave desconocida se muestra tal cual: en un registro de
          // auditoría es preferible una etiqueta fea a un dato escondido.
          etiqueta={ETIQUETA_DATO_ADICIONAL[clave] ?? clave}
          key={clave}
          valor={aTexto(valor)}
        />
      ))}
    </dl>
  );
}

function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'string') return valor || '—';
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  if (Array.isArray(valor)) return valor.map(aTexto).join(', ');
  return JSON.stringify(valor);
}
