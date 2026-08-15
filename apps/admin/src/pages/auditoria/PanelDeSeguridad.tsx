import { useState } from 'react';
import { MENSAJES_AUDITORIA, type EventoSeguridad } from '@foodhub/shared';
import {
  hayFiltrosSeguridad,
  rangoEsInvalido,
  type FiltrosSeguridad,
} from '../../api/auditoria.js';
import { EsqueletoDeTabla } from '../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../components/estados/EstadoVacio.js';
import { IconoModeracion } from '../../components/iconos/index.js';
import { InsigniaEventoSeguridad } from '../../components/InsigniasDelDominio.js';
import { PaginacionDeTabla } from '../../components/PaginacionDeTabla.js';
import { formatearFechaHora, formatearNumero } from '../../lib/formato.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';
import { DetalleDeRegistro } from './DetalleDeRegistro.js';
import { FiltrosDeSeguridad } from './FiltrosDeSeguridad.js';
import { SelectorDeTamano } from './SelectorDeTamano.js';
import { TablaDeSeguridad } from './TablaDeSeguridad.js';
import type { TablaDeAuditoria } from './tipos.js';

/**
 * Solapa "Seguridad" de PAN-AUD-01 — US-AUD-01.
 *
 * Muestra `evento_seguridad`: intentos de login fallidos y accesos denegados
 * por falta de permisos. No comparte tabla con la solapa de operaciones porque
 * la mitad de las columnas de cada una no aplica a la otra.
 */
type Tabla = TablaDeAuditoria<FiltrosSeguridad, EventoSeguridad>;

export function PanelDeSeguridad({ tabla }: { tabla: Tabla }) {
  const [elegido, setElegido] = useState<EventoSeguridad | null>(null);

  const { filtros, consulta, aplicar, irAPagina, limpiar } = tabla;
  const eventos = consulta.data?.datos ?? [];
  const total = consulta.data?.total ?? 0;
  const rangoInvalido = rangoEsInvalido(filtros.desde, filtros.hasta);

  return (
    <>
      <FiltrosDeSeguridad
        alCambiar={aplicar}
        filtros={filtros}
        rangoInvalido={rangoInvalido}
      />

      {rangoInvalido ? (
        <p className="border-b border-border px-4 py-2 text-label text-error">
          {TEXTOS_AUDITORIA.rangoInvalido}
        </p>
      ) : null}

      <Contenido
        alElegir={setElegido}
        alLimpiar={limpiar}
        consulta={consulta}
        eventos={eventos}
        hayFiltros={hayFiltrosSeguridad(filtros)}
      />

      {eventos.length > 0 ? (
        <PaginacionDeTabla
          alCambiarPagina={irAPagina}
          controlesExtra={
            <SelectorDeTamano
              alCambiar={(porPagina) => {
                aplicar({ porPagina });
              }}
              valor={filtros.porPagina}
            />
          }
          pagina={filtros.pagina}
          porPagina={filtros.porPagina}
          resumen={`${formatearNumero(total)} eventos`}
          total={total}
        />
      ) : null}

      {elegido ? (
        <DetalleDeRegistro
          alCerrar={() => {
            setElegido(null);
          }}
          campos={camposDelDetalle(elegido)}
          titulo={TEXTOS_AUDITORIA.detalleTituloSeguridad}
        />
      ) : null}
    </>
  );
}

/** Los cuatro estados de la solapa: error, cargando, vacío y con datos. */
function Contenido({
  consulta,
  eventos,
  hayFiltros,
  alElegir,
  alLimpiar,
}: {
  consulta: Tabla['consulta'];
  eventos: readonly EventoSeguridad[];
  hayFiltros: boolean;
  alElegir: (evento: EventoSeguridad) => void;
  alLimpiar: () => void;
}) {
  if (consulta.isError) {
    return (
      <EstadoError
        alReintentar={() => {
          void consulta.refetch();
        }}
        error={consulta.error}
      />
    );
  }

  if (consulta.isPending) return <EsqueletoDeTabla columnas={6} />;

  if (eventos.length === 0) {
    return (
      <EstadoVacio
        {...(hayFiltros
          ? {
              accion: {
                etiqueta: MENSAJES_AUDITORIA.limpiarFiltros,
                alPresionar: alLimpiar,
              },
            }
          : {})}
        icono={<IconoModeracion className="size-7" />}
        mensaje={MENSAJES_AUDITORIA.sinEventosSeguridad}
      />
    );
  }

  return <TablaDeSeguridad alElegir={alElegir} eventos={eventos} />;
}

/** Campos del modal de detalle. Se muestran todos, incluso los vacíos. */
function camposDelDetalle(evento: EventoSeguridad) {
  return [
    {
      etiqueta: TEXTOS_AUDITORIA.columnaFechaHora,
      valor: formatearFechaHora(evento.fechaHora),
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaTipoEvento,
      valor: <InsigniaEventoSeguridad tipo={evento.tipoEvento} />,
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaCorreoIntentado,
      valor: evento.emailIntentado ?? '—',
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaUsuarioId,
      valor: evento.usuarioId ?? '—',
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaRecurso,
      valor: evento.recursoSolicitado ?? '—',
    },
    { etiqueta: TEXTOS_AUDITORIA.columnaIp, valor: evento.ipOrigen ?? '—' },
    { etiqueta: TEXTOS_AUDITORIA.columnaMotivo, valor: evento.motivo ?? '—' },
    { etiqueta: TEXTOS_AUDITORIA.campoEventoId, valor: evento.id },
  ];
}
