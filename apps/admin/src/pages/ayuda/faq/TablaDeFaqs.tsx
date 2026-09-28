import { Button } from '@heroui/react';
import {
  ETIQUETAS_ROL_DESTINO_AYUDA,
  type FaqAdminListado,
} from '@foodhub/shared';
import { InsigniaHabilitacion } from '../../../components/InsigniasDelDominio.js';
import {
  IconoEditar,
  IconoExito,
  IconoOcultar,
} from '../../../components/iconos/index.js';
import { formatearNumero } from '../../../lib/formato.js';
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';

/**
 * Tabla de preguntas frecuentes — US-AYU-05: pregunta, categoría, rol,
 * votos útiles, estado y acciones.
 */
export interface AccionesDeFaq {
  editar: (faq: FaqAdminListado) => void;
  habilitar: (faq: FaqAdminListado) => void;
  deshabilitar: (faq: FaqAdminListado) => void;
}

export function TablaDeFaqs({
  faqs,
  acciones,
}: {
  faqs: readonly FaqAdminListado[];
  acciones: AccionesDeFaq;
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaPregunta}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaCategoria}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaRol}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaVotosUtiles}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaEstado}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaAcciones}</Encabezado>
        </tr>
      </thead>
      <tbody>
        {faqs.map((faq) => (
          <tr className="aparece-fila border-b border-border" key={faq.id}>
            <td className="max-w-[420px] px-4 py-3.5">
              <span className="font-semibold text-text-primary">
                {faq.pregunta}
              </span>
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {faq.categoria ?? '—'}
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {ETIQUETAS_ROL_DESTINO_AYUDA[faq.rolDestino]}
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {formatearNumero(faq.votosUtil)}
            </td>
            <td className="px-4 py-3.5">
              <InsigniaHabilitacion
                activo={faq.activo}
                etiquetaDeshabilitado="Deshabilitada"
                etiquetaHabilitado="Habilitada"
              />
            </td>
            <td className="px-4 py-3.5">
              <AccionesDeFaq acciones={acciones} faq={faq} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Encabezado({ children }: { children: string }) {
  return (
    <th
      className="px-4 py-3 text-caption font-semibold tracking-wide text-text-secondary"
      scope="col"
    >
      {children}
    </th>
  );
}

function AccionesDeFaq({
  faq,
  acciones,
}: {
  faq: FaqAdminListado;
  acciones: AccionesDeFaq;
}) {
  return (
    <div className="flex items-center gap-1">
      <BotonDeAccion
        alPresionar={() => {
          acciones.editar(faq);
        }}
        etiqueta={`${TEXTOS_GESTION_AYUDA.accionEditarFaq}: ${faq.pregunta}`}
      >
        <IconoEditar className="size-4.5" />
      </BotonDeAccion>

      {faq.activo ? (
        <BotonDeAccion
          alPresionar={() => {
            acciones.deshabilitar(faq);
          }}
          etiqueta={`${TEXTOS_GESTION_AYUDA.accionDeshabilitarFaq}: ${faq.pregunta}`}
        >
          <IconoOcultar className="size-4.5" />
        </BotonDeAccion>
      ) : (
        <BotonDeAccion
          alPresionar={() => {
            acciones.habilitar(faq);
          }}
          etiqueta={`${TEXTOS_GESTION_AYUDA.accionHabilitarFaq}: ${faq.pregunta}`}
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
