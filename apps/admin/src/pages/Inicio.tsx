import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { obtenerReportesPendientes } from '../api/moderacion.js';
import { Insignia } from '../components/Insignia.js';
import {
  IconoChevronDerecha,
  IconoModeracion,
} from '../components/iconos/index.js';
import { EncabezadoPantalla } from '../components/layout/EncabezadoPantalla.js';
import { ITEMS_DE_NAVEGACION } from '../components/layout/navegacion.js';
import { useSesion } from '../hooks/useSesion.js';
import { RUTAS } from '../lib/rutas.js';
import { TEXTOS_ESTADO, TEXTOS_INICIO } from '../lib/textos.js';
import { ActividadReciente } from './metricas/ActividadReciente.js';
import { TarjetasKpi } from './metricas/TarjetasKpi.js';
import { useMetricas } from './metricas/useMetricas.js';

/**
 * Inicio del panel.
 *
 * SIN CÓDIGO PAN: la maquetación de la Etapa 5 no define esta pantalla y el
 * equipo la dejó libre. Es un tablero de entrada que no agrega datos nuevos:
 * reutiliza las métricas del mes (PAN-ADM-03), el contador de reseñas
 * reportadas de la moderación (RF086) y la navegación de la barra lateral.
 * Todo lo que muestra lleva a la pantalla donde se trabaja.
 */
const FORMATO_DE_HOY = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function Inicio() {
  const { perfil } = useSesion();
  const { consulta } = useMetricas();
  const fecha = FORMATO_DE_HOY.format(new Date());

  return (
    <>
      <EncabezadoPantalla
        notificacionesPendientes={null}
        subtitulo={fecha.charAt(0).toUpperCase() + fecha.slice(1)}
        titulo={
          perfil ? TEXTOS_INICIO.saludo(perfil.nombre) : TEXTOS_ESTADO.cargando
        }
      />

      <div className="space-y-8 p-8">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 font-bold text-text-primary">
              {TEXTOS_INICIO.resumenDelMes}
            </h2>
            <Link
              className="text-body font-semibold text-primary hover:text-primary-dark"
              to={RUTAS.metricas}
            >
              {TEXTOS_INICIO.verMetricas}
            </Link>
          </div>
          {consulta.data ? (
            <TarjetasKpi compacto kpis={consulta.data.kpis} />
          ) : (
            <div className="h-32 animate-pulse rounded-lg bg-border/50" />
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Pendientes />
          <AccesosRapidos />
        </div>

        {consulta.data ? (
          <ActividadReciente compacta filas={consulta.data.actividadReciente} />
        ) : null}
      </div>
    </>
  );
}

/** Lo que espera una decisión del administrador. Hoy: reseñas reportadas. */
function Pendientes() {
  const reportes = useQuery({
    queryKey: ['moderacion', 'reportes', 'contador'],
    queryFn: () => obtenerReportesPendientes({ pagina: 1, porPagina: 1 }),
  });
  const total = reportes.data?.total ?? 0;

  return (
    <section className="aparece rounded-lg border border-border bg-surface p-5">
      <h2 className="text-h3 font-bold text-text-primary">
        {TEXTOS_INICIO.pendientes}
      </h2>

      <div className="mt-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-error/10 text-error"
        >
          <IconoModeracion className="size-5" />
        </span>
        <div className="space-y-2">
          {reportes.data ? (
            total > 0 ? (
              <Insignia tono="rojo">
                {TEXTOS_INICIO.resenasReportadas(total)}
              </Insignia>
            ) : (
              <p className="text-body text-text-secondary">
                {TEXTOS_INICIO.sinResenasReportadas}
              </p>
            )
          ) : (
            <p className="text-body text-text-secondary">
              {TEXTOS_ESTADO.cargando}
            </p>
          )}
          <Link
            className="flex items-center gap-1 text-body font-semibold text-primary hover:text-primary-dark"
            to={RUTAS.moderacion}
          >
            {TEXTOS_INICIO.revisarModeracion}
            <IconoChevronDerecha className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Las secciones del panel como tarjetas, con qué se hace en cada una. */
function AccesosRapidos() {
  const destinos = ITEMS_DE_NAVEGACION.filter(
    (item) => item.ruta !== RUTAS.inicio,
  );

  return (
    <section className="aparece">
      <h2 className="sr-only">{TEXTOS_INICIO.accesosRapidos}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {destinos.map(({ ruta, etiqueta, Icono }) => (
          <li key={ruta}>
            <Link
              className="group flex h-full items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-primary focus-visible:border-primary"
              to={ruta}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary"
              >
                <Icono className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-primary">
                  {etiqueta}
                </span>
                <span className="block text-caption text-text-secondary">
                  {TEXTOS_INICIO.descripcion[ruta]}
                </span>
              </span>
              <IconoChevronDerecha className="mt-1 size-4 text-text-disabled transition-colors duration-150 group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
