import { useState } from 'react';
import {
  MENSAJES_AUDITORIA,
  OPERACION_AUDITORIA,
  type OperacionAuditoria,
  type RegistroAuditoria,
} from '@foodhub/shared';
import {
  hayFiltrosOperaciones,
  rangoEsInvalido,
  type FiltrosOperaciones,
} from '../../api/auditoria.js';
import { EsqueletoDeTabla } from '../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../components/estados/EstadoVacio.js';
import { IconoAuditoria } from '../../components/iconos/index.js';
import { InsigniaOperacion } from '../../components/InsigniasDelDominio.js';
import { PaginacionDeTabla } from '../../components/PaginacionDeTabla.js';
import { SelectorDeFiltro } from '../../components/SelectorDeFiltro.js';
import { ETIQUETA_OPERACION } from '../../lib/etiquetas.js';
import { formatearFechaHora, formatearNumero } from '../../lib/formato.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';
import { DetalleDeRegistro } from './DetalleDeRegistro.js';
import { FiltrosComunes } from './FiltrosComunes.js';
import { SelectorDeTamano } from './SelectorDeTamano.js';
import { TablaDeOperaciones } from './TablaDeOperaciones.js';
import type { TablaDeAuditoria } from './tipos.js';

/**
 * Solapa "Operaciones" de PAN-AUD-01 — US-AUD-02.
 *
 * Muestra `registro_auditoria`: quién dio de alta, modificó o dio de baja qué
 * cosa. Ordenado por fecha descendente siempre; el orden lo garantiza el
 * servidor y la interfaz no ofrece cambiarlo.
 */

type Tabla = TablaDeAuditoria<FiltrosOperaciones, RegistroAuditoria>;

const OPCIONES_OPERACION = OPERACION_AUDITORIA.map((operacion) => ({
  valor: operacion,
  etiqueta: ETIQUETA_OPERACION[operacion],
}));

export function PanelDeOperaciones({ tabla }: { tabla: Tabla }) {
  const [elegido, setElegido] = useState<RegistroAuditoria | null>(null);

  const { filtros, consulta, aplicar, irAPagina, limpiar } = tabla;
  const registros = consulta.data?.datos ?? [];
  const total = consulta.data?.total ?? 0;
  const rangoInvalido = rangoEsInvalido(filtros.desde, filtros.hasta);

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
        <FiltrosComunes
          alCambiar={aplicar}
          desde={filtros.desde}
          hasta={filtros.hasta}
          ipOrigen={filtros.ipOrigen}
          rangoInvalido={rangoInvalido}
          usuarioId={filtros.usuarioId}
        />

        <SelectorDeFiltro
          alCambiar={(operacion: OperacionAuditoria | null) => {
            aplicar({ operacion });
          }}
          etiqueta={TEXTOS_AUDITORIA.operacion}
          etiquetaTodos={TEXTOS_AUDITORIA.todas}
          opciones={OPCIONES_OPERACION}
          valor={filtros.operacion}
        />
      </div>

      {rangoInvalido ? (
        <p className="border-b border-border px-4 py-2 text-label text-error">
          {TEXTOS_AUDITORIA.rangoInvalido}
        </p>
      ) : null}

      <Contenido
        alElegir={setElegido}
        alLimpiar={limpiar}
        consulta={consulta}
        hayFiltros={hayFiltrosOperaciones(filtros)}
        registros={registros}
      />

      {registros.length > 0 ? (
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
          resumen={`${formatearNumero(total)} registros`}
          total={total}
        />
      ) : null}

      {elegido ? (
        <DetalleDeRegistro
          alCerrar={() => {
            setElegido(null);
          }}
          campos={camposDelDetalle(elegido)}
          datosAdicionales={elegido.datosAdicionales}
          titulo={TEXTOS_AUDITORIA.detalleTitulo}
        />
      ) : null}
    </>
  );
}

/**
 * Los cuatro estados de la solapa, en el orden en que hay que evaluarlos:
 * primero el error, que invalida todo lo demás; después la carga; después el
 * vacío; al final, los datos.
 */
function Contenido({
  consulta,
  registros,
  hayFiltros,
  alElegir,
  alLimpiar,
}: {
  consulta: Tabla['consulta'];
  registros: readonly RegistroAuditoria[];
  hayFiltros: boolean;
  alElegir: (registro: RegistroAuditoria) => void;
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

  if (registros.length === 0) {
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
        icono={<IconoAuditoria className="size-7" />}
        mensaje={MENSAJES_AUDITORIA.sinResultados}
      />
    );
  }

  return <TablaDeOperaciones alElegir={alElegir} registros={registros} />;
}

/**
 * Campos del modal de detalle. Se muestran todos, incluso los vacíos: un
 * registro de auditoría es evidencia y que un dato falte también es
 * información.
 */
function camposDelDetalle(registro: RegistroAuditoria) {
  return [
    {
      etiqueta: TEXTOS_AUDITORIA.columnaFechaHora,
      valor: formatearFechaHora(registro.fechaHora),
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaEmail,
      valor: registro.usuarioEmail ?? '—',
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaUsuarioId,
      valor: registro.usuarioId ?? '—',
    },
    {
      etiqueta: TEXTOS_AUDITORIA.columnaOperacion,
      valor: <InsigniaOperacion operacion={registro.operacion} />,
    },
    { etiqueta: TEXTOS_AUDITORIA.columnaObjeto, valor: registro.tipoObjeto },
    {
      etiqueta: TEXTOS_AUDITORIA.campoObjetoId,
      valor: registro.objetoAfectadoId ?? '—',
    },
    { etiqueta: TEXTOS_AUDITORIA.columnaIp, valor: registro.ipOrigen ?? '—' },
    { etiqueta: TEXTOS_AUDITORIA.campoRegistroId, valor: registro.id },
  ];
}
