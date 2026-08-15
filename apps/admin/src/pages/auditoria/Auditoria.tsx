import { useState } from 'react';
import { Tabs } from '@heroui/react';
import {
  claveOperaciones,
  claveSeguridad,
  exportarOperaciones,
  exportarSeguridad,
  FILTROS_OPERACIONES_INICIALES,
  FILTROS_SEGURIDAD_INICIALES,
  listarEventosSeguridad,
  listarOperaciones,
} from '../../api/auditoria.js';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { useTablaDeAuditoria } from '../../hooks/useTablaDeAuditoria.js';
import { formatearNumero, nombreDeExportacion } from '../../lib/formato.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';
import { BotonDeExportacion } from './BotonDeExportacion.js';
import { PanelDeOperaciones } from './PanelDeOperaciones.js';
import { PanelDeSeguridad } from './PanelDeSeguridad.js';

/**
 * PAN-AUD-01 · Registros de auditoría — US-AUD-01 y US-AUD-02.
 *
 * Dos solapas sobre dos tablas con propósitos distintos: `registro_auditoria`
 * guarda operaciones de negocio y `evento_seguridad` guarda intentos fallidos y
 * accesos denegados. Comparten pantalla porque quien audita las mira juntas, y
 * no comparten tabla porque la mitad de las columnas de cada una no aplica a
 * la otra.
 *
 * El estado de las dos vive acá, y no dentro de cada panel, para que el
 * encabezado pueda mostrar el total de la solapa activa y exportar exactamente
 * lo que se está viendo.
 */
type Solapa = 'operaciones' | 'seguridad';

export function Auditoria() {
  const [solapa, setSolapa] = useState<Solapa>('operaciones');

  const operaciones = useTablaDeAuditoria({
    filtrosIniciales: FILTROS_OPERACIONES_INICIALES,
    clave: claveOperaciones,
    consultar: listarOperaciones,
  });

  const seguridad = useTablaDeAuditoria({
    filtrosIniciales: FILTROS_SEGURIDAD_INICIALES,
    clave: claveSeguridad,
    consultar: listarEventosSeguridad,
  });

  const activa = solapa === 'operaciones' ? operaciones : seguridad;
  const total = activa.consulta.data?.total ?? 0;

  /**
   * Se exportan los filtros diferidos y no los del formulario: son los mismos
   * con los que se armó la tabla que el administrador está mirando.
   */
  function exportar(): Promise<void> {
    if (solapa === 'operaciones') {
      return exportarOperaciones(
        operaciones.filtrosDiferidos,
        nombreDeExportacion('auditoria-operaciones'),
      );
    }
    return exportarSeguridad(
      seguridad.filtrosDiferidos,
      nombreDeExportacion('auditoria-seguridad'),
    );
  }

  return (
    <>
      <EncabezadoPantalla
        acciones={
          <BotonDeExportacion
            deshabilitado={activa.consulta.isPending}
            exportar={exportar}
          />
        }
        notificacionesPendientes={null}
        subtitulo={
          activa.consulta.isPending
            ? ' '
            : `${formatearNumero(total)} registros · ordenados por fecha descendente`
        }
        titulo={TEXTOS_AUDITORIA.titulo}
      />

      <div className="p-8">
        <Tabs
          onSelectionChange={(clave) => {
            setSolapa(String(clave) as Solapa);
          }}
          selectedKey={solapa}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={TEXTOS_AUDITORIA.titulo}>
              <Tabs.Tab id="operaciones">
                {TEXTOS_AUDITORIA.solapaOperaciones}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="seguridad">
                {TEXTOS_AUDITORIA.solapaSeguridad}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="pt-4" id="operaciones">
            <Marco>
              <PanelDeOperaciones tabla={operaciones} />
            </Marco>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="seguridad">
            <Marco>
              <PanelDeSeguridad tabla={seguridad} />
            </Marco>
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

/** Tarjeta que contiene la tabla de una solapa. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
      {children}
    </section>
  );
}
