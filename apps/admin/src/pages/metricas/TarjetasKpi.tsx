import type { ComponentType } from 'react';
import type { Indicador, MetricasAdmin } from '@foodhub/shared';
import { Insignia } from '../../components/Insignia.js';
import {
  IconoBandeja,
  IconoExito,
  IconoUsuarios,
} from '../../components/iconos/index.js';
import type { PropsIcono } from '../../components/iconos/tipos.js';
import { clases } from '../../lib/clases.js';
import { formatearNumero } from '../../lib/formato.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';

/**
 * Los cuatro KPI del mockup de PAN-ADM-03, con su variación.
 *
 * Es una tarjeta de número y no un gráfico: la tarea es leer UNA cifra. El
 * chip de variación lleva signo y texto (no solo color), y no se dibuja cuando
 * no hay base contra la cual comparar.
 *
 * Íconos: la guía visual no tiene uno de cocinero ni de plato; se reutilizan
 * los del sistema en lugar de dibujar íconos nuevos.
 */
interface DefinicionDeKpi {
  clave: keyof MetricasAdmin['kpis'];
  etiqueta: string;
  Icono: ComponentType<PropsIcono>;
  fondo: string;
}

const KPIS: readonly DefinicionDeKpi[] = [
  {
    clave: 'usuariosActivos',
    etiqueta: TEXTOS_METRICAS.usuariosActivos,
    Icono: IconoUsuarios,
    fondo: 'bg-secondary/12 text-secondary',
  },
  {
    clave: 'cocinerosActivos',
    etiqueta: TEXTOS_METRICAS.cocinerosActivos,
    Icono: IconoUsuarios,
    fondo: 'bg-primary/12 text-primary',
  },
  {
    clave: 'pedidosCompletados',
    etiqueta: TEXTOS_METRICAS.pedidosCompletados,
    Icono: IconoExito,
    fondo: 'bg-success/12 text-success',
  },
  {
    clave: 'publicacionesActivas',
    etiqueta: TEXTOS_METRICAS.publicacionesActivas,
    Icono: IconoBandeja,
    fondo: 'bg-primary/12 text-primary',
  },
];

export function TarjetasKpi({
  kpis,
  compacto = false,
}: {
  kpis: MetricasAdmin['kpis'];
  /** En el Inicio las tarjetas van más chicas y sin el texto de comparación. */
  compacto?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {KPIS.map((kpi) => (
        <TarjetaKpi
          compacto={compacto}
          definicion={kpi}
          indicador={kpis[kpi.clave]}
          key={kpi.clave}
        />
      ))}
    </div>
  );
}

function TarjetaKpi({
  definicion,
  indicador,
  compacto,
}: {
  definicion: DefinicionDeKpi;
  indicador: Indicador;
  compacto: boolean;
}) {
  const { Icono } = definicion;

  return (
    <article
      className={clases(
        'aparece rounded-lg border border-border bg-surface',
        compacto ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className={clases(
            'flex size-10 items-center justify-center rounded-md',
            definicion.fondo,
          )}
        >
          <Icono className="size-5" />
        </span>
        {indicador.variacion === null ? null : (
          <Insignia
            tono={indicador.variacion < 0 ? 'rojo' : 'verde'}
            {...(compacto ? {} : { className: 'tabular-nums' })}
          >
            <span className="sr-only">{TEXTOS_METRICAS.variacionContra}: </span>
            {TEXTOS_METRICAS.variacion(indicador.variacion)}
          </Insignia>
        )}
      </div>

      <p
        className={clases(
          'mt-4 font-extrabold text-text-primary tabular-nums',
          compacto ? 'text-h2' : 'text-h1',
        )}
      >
        {formatearNumero(indicador.valor)}
      </p>
      <p className="text-body text-text-secondary">{definicion.etiqueta}</p>
    </article>
  );
}
