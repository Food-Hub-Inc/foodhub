import { Button } from '@heroui/react';
import {
  ETIQUETAS_ROL_DESTINO_AYUDA,
  type CapituloAyudaListado,
} from '@foodhub/shared';
import { InsigniaHabilitacion } from '../../../components/InsigniasDelDominio.js';
import {
  IconoEditar,
  IconoExito,
  IconoOcultar,
} from '../../../components/iconos/index.js';
import { formatearFechaHora, formatearNumero } from '../../../lib/formato.js';
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';

/**
 * Tabla del manual de usuario — US-AYU-05: título, rol destinatario, cantidad
 * de secciones, estado, última modificación y acciones.
 */
export interface AccionesDeCapitulo {
  editar: (capitulo: CapituloAyudaListado) => void;
  habilitar: (capitulo: CapituloAyudaListado) => void;
  deshabilitar: (capitulo: CapituloAyudaListado) => void;
}

export function TablaDeCapitulos({
  capitulos,
  acciones,
}: {
  capitulos: readonly CapituloAyudaListado[];
  acciones: AccionesDeCapitulo;
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaTitulo}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaRol}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaSecciones}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaEstado}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaModificacion}</Encabezado>
          <Encabezado>{TEXTOS_GESTION_AYUDA.columnaAcciones}</Encabezado>
        </tr>
      </thead>
      <tbody>
        {capitulos.map((capitulo) => (
          <tr className="aparece-fila border-b border-border" key={capitulo.id}>
            <td className="px-4 py-3.5">
              <span className="font-semibold text-text-primary">
                {capitulo.titulo}
              </span>
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {ETIQUETAS_ROL_DESTINO_AYUDA[capitulo.rolDestino]}
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {formatearNumero(capitulo.secciones.length)}
            </td>
            <td className="px-4 py-3.5">
              <InsigniaHabilitacion
                activo={capitulo.activo}
                etiquetaDeshabilitado="Deshabilitado"
                etiquetaHabilitado="Habilitado"
              />
            </td>
            <td className="px-4 py-3.5 text-text-secondary">
              {formatearFechaHora(capitulo.fechaUltimaModificacion)}
            </td>
            <td className="px-4 py-3.5">
              <AccionesDeCapitulo acciones={acciones} capitulo={capitulo} />
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

function AccionesDeCapitulo({
  capitulo,
  acciones,
}: {
  capitulo: CapituloAyudaListado;
  acciones: AccionesDeCapitulo;
}) {
  return (
    <div className="flex items-center gap-1">
      <BotonDeAccion
        alPresionar={() => {
          acciones.editar(capitulo);
        }}
        etiqueta={`${TEXTOS_GESTION_AYUDA.accionEditarCapitulo}: ${capitulo.titulo}`}
      >
        <IconoEditar className="size-4.5" />
      </BotonDeAccion>

      {capitulo.activo ? (
        <BotonDeAccion
          alPresionar={() => {
            acciones.deshabilitar(capitulo);
          }}
          etiqueta={`${TEXTOS_GESTION_AYUDA.accionDeshabilitarCapitulo}: ${capitulo.titulo}`}
        >
          <IconoOcultar className="size-4.5" />
        </BotonDeAccion>
      ) : (
        <BotonDeAccion
          alPresionar={() => {
            acciones.habilitar(capitulo);
          }}
          etiqueta={`${TEXTOS_GESTION_AYUDA.accionHabilitarCapitulo}: ${capitulo.titulo}`}
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
