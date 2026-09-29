import type { ReactNode } from 'react';
import { Button } from '@heroui/react';
import { MENSAJES_METRICAS, type MetricasAdmin } from '@foodhub/shared';
import { EstadoError } from '../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../components/estados/EstadoVacio.js';
import {
  IconoDescargar,
  IconoMetricas,
} from '../../components/iconos/index.js';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { LogoFoodhub } from '../../components/LogoFoodhub.js';
import { formatearFecha, formatearFechaHora } from '../../lib/formato.js';
import { TEXTOS_ESTADO, TEXTOS_METRICAS } from '../../lib/textos.js';
import { ActividadReciente } from './ActividadReciente.js';
import { GraficoDePedidos } from './GraficoDePedidos.js';
import { GraficoDeRoles } from './GraficoDeRoles.js';
import { PedidosPorEstado } from './PedidosPorEstado.js';
import { SelectorDePeriodo } from './SelectorDePeriodo.js';
import { TarjetasKpi } from './TarjetasKpi.js';
import { useMetricas } from './useMetricas.js';

/**
 * PAN-ADM-03 · Métricas del sistema — US-ADM-05 (RF052, RF053) y REP-02.
 *
 * Layout del mockup `ADM-03.jpg`: KPI arriba, barras de pedidos y torta de
 * usuarios por rol, actividad reciente abajo. Se suma el bloque de pedidos
 * por estado y el período personalizado, que la US exige y el mockup no
 * dibuja (decisión del equipo).
 *
 * REP-02 es esta misma pantalla impresa: "Exportar PDF" abre el diálogo de
 * impresión del navegador, donde se guarda como PDF, y la hoja `@media print`
 * de `global.css` oculta la barra lateral y los controles y muestra la
 * cabecera del reporte. Sin dependencias de generación de PDF.
 */
export function Metricas() {
  const { seleccion, setSeleccion, rango, consulta, tramos, actualizado } =
    useMetricas();

  return (
    <>
      <EncabezadoPantalla
        acciones={
          <div className="flex flex-wrap items-end gap-2" data-no-imprimir>
            <SelectorDePeriodo
              alCambiar={setSeleccion}
              error={rango.valido ? null : rango.error}
              seleccion={seleccion}
            />
            <Button
              isDisabled={!consulta.data}
              onPress={() => {
                window.print();
              }}
              variant="secondary"
            >
              <IconoDescargar className="size-4" />
              {TEXTOS_METRICAS.exportarPdf}
            </Button>
          </div>
        }
        notificacionesPendientes={null}
        subtitulo={
          actualizado
            ? TEXTOS_METRICAS.actualizado(actualizado)
            : TEXTOS_ESTADO.cargando
        }
        titulo={TEXTOS_METRICAS.titulo}
      />

      <div className="space-y-6 p-8">
        {rango.valido ? (
          <CabeceraDelReporte desde={rango.desde} hasta={rango.hasta} />
        ) : null}

        <Contenido
          alReintentar={() => {
            void consulta.refetch();
          }}
          consulta={consulta}
          tramos={tramos}
          subtituloSerie={TEXTOS_METRICAS.subtituloSerie[seleccion.periodo]}
        />
      </div>
    </>
  );
}

/** Los estados de la pantalla: error, carga y datos (el vacío va por bloque). */
function Contenido({
  consulta,
  tramos,
  subtituloSerie,
  alReintentar,
}: {
  consulta: {
    data: MetricasAdmin | undefined;
    isError: boolean;
    error: unknown;
  };
  tramos: Parameters<typeof GraficoDePedidos>[0]['tramos'];
  subtituloSerie: string;
  alReintentar: () => void;
}) {
  if (consulta.isError) {
    return <EstadoError alReintentar={alReintentar} error={consulta.error} />;
  }

  const metricas = consulta.data;
  if (!metricas) return <Esqueleto />;

  return (
    <>
      <TarjetasKpi kpis={metricas.kpis} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          subtitulo={subtituloSerie}
          titulo={TEXTOS_METRICAS.graficoPedidos}
        >
          {/* Cuarto criterio: sin datos en el período, estado vacío claro y
              los indicadores en cero, sin errores. */}
          {metricas.pedidos.total === 0 ? (
            <EstadoVacio
              icono={<IconoMetricas className="size-7" />}
              mensaje={MENSAJES_METRICAS.sinPedidos}
            />
          ) : (
            <GraficoDePedidos tramos={tramos} />
          )}
        </Panel>

        <Panel titulo={TEXTOS_METRICAS.usuariosPorRol}>
          <GraficoDeRoles usuariosPorRol={metricas.usuariosPorRol} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel titulo={TEXTOS_METRICAS.pedidosPorEstado}>
          <PedidosPorEstado pedidos={metricas.pedidos} />
        </Panel>
        <ActividadReciente filas={metricas.actividadReciente} />
      </div>
    </>
  );
}

export function Panel({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <section className="aparece break-inside-avoid rounded-lg border border-border bg-surface p-5">
      <h2 className="text-h3 font-bold text-text-primary">{titulo}</h2>
      {subtitulo ? (
        <p className="text-caption text-text-secondary">{subtitulo}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Forma de la pantalla mientras carga, no un spinner suelto. */
function Esqueleto() {
  return (
    <div aria-busy="true" className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, indice) => (
          <div
            className="h-36 animate-pulse rounded-lg bg-border/50"
            key={indice}
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-border/50" />
    </div>
  );
}

/**
 * Cabecera de REP-02: solo aparece al imprimir (`data-solo-impresion`). En
 * pantalla el período ya está a la vista en el selector.
 */
function CabeceraDelReporte({ desde, hasta }: { desde: Date; hasta: Date }) {
  return (
    <div
      className="hidden items-center justify-between border-b border-border pb-4"
      data-solo-impresion
    >
      <LogoFoodhub />
      <div className="text-right">
        <p className="text-h3 font-bold text-text-primary">
          {TEXTOS_METRICAS.reporteTitulo}
        </p>
        <p className="text-caption text-text-secondary">
          {TEXTOS_METRICAS.reportePeriodo(
            formatearFecha(desde.toISOString()),
            formatearFecha(hasta.toISOString()),
          )}
        </p>
        <p className="text-caption text-text-secondary">
          {TEXTOS_METRICAS.reporteEmitido(
            formatearFechaHora(new Date().toISOString()),
          )}
        </p>
      </div>
    </div>
  );
}
