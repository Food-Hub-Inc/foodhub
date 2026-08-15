import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';
import { clases } from '../../lib/clases.js';
import { useSesion } from '../../hooks/useSesion.js';
import { iniciales, nombreCompleto } from '../../lib/formato.js';
import { ROL_EN_PROSA } from '../../lib/etiquetas.js';
import { TEXTOS_PANEL } from '../../lib/textos.js';
import { IconoCerrarSesion } from '../iconos/index.js';
import { LogoFoodhub } from '../LogoFoodhub.js';
import { ITEMS_DE_NAVEGACION, type ItemDeNavegacion } from './navegacion.js';

/**
 * Barra lateral fija del panel (maquetación de la Etapa 5).
 *
 * Es la única superficie oscura del sistema. No usa colores nuevos: el fondo es
 * `--color-text-primary` y el texto `--color-surface`, los mismos dos tokens
 * de siempre con los roles invertidos.
 */
export function BarraLateral({
  reportesPendientes,
}: {
  /**
   * Contador del ítem Moderación. `null` mientras el módulo no exista: no hay
   * endpoint que lo informe y una cifra inventada en un panel de
   * administración es peor que ningún dato.
   */
  reportesPendientes: number | null;
}) {
  const { perfil, cerrarSesion } = useSesion();
  const navegar = useNavigate();

  async function salir() {
    await cerrarSesion();
    void navegar('/login', { replace: true });
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-text-primary text-surface">
      <div className="flex items-center justify-between gap-2 px-5 pt-6 pb-7">
        <LogoFoodhub />
        <span className="rounded-full bg-primary/20 px-2.5 py-1 text-caption font-bold tracking-wider text-primary">
          {TEXTOS_PANEL.insigniaAdmin}
        </span>
      </div>

      <nav aria-label={TEXTOS_PANEL.seccionGeneral} className="flex-1 px-3">
        <p className="px-2 pb-2 text-caption font-semibold tracking-widest text-surface/40">
          {TEXTOS_PANEL.seccionGeneral}
        </p>

        <ul className="space-y-1">
          {ITEMS_DE_NAVEGACION.map((item) => (
            <li key={item.ruta}>
              <ItemBarra item={item} pendientes={reportesPendientes} />
            </li>
          ))}
        </ul>
      </nav>

      {perfil ? (
        <div className="m-3 flex items-center gap-3 rounded-md bg-surface/8 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold text-surface">
            {iniciales(perfil.nombre, perfil.apellido)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-label font-semibold text-surface">
              {nombreCompleto(perfil.nombre, perfil.apellido)}
            </p>
            <p className="truncate text-caption text-surface/50">
              {ROL_EN_PROSA[perfil.tipo]}
            </p>
          </div>

          <Button
            aria-label={TEXTOS_PANEL.cerrarSesion}
            className="size-9 shrink-0 text-surface/60 transition-colors duration-150 hover:bg-surface/10 hover:text-surface"
            isIconOnly
            onPress={() => void salir()}
            size="sm"
            variant="ghost"
          >
            <IconoCerrarSesion className="size-4.5" />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function ItemBarra({
  item,
  pendientes,
}: {
  item: ItemDeNavegacion;
  pendientes: number | null;
}) {
  const { Icono, etiqueta, ruta } = item;
  const muestraContador =
    item.muestraPendientes && pendientes !== null && pendientes > 0;

  return (
    <NavLink
      // `end` solo en la raíz: sin eso, "/" quedaría activo en todas las rutas
      // porque toda ruta empieza con una barra.
      className={({ isActive }) =>
        clases(
          'relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-label font-semibold transition-colors duration-150',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-surface/65 hover:bg-surface/8 hover:text-surface',
        )
      }
      end={ruta === '/'}
      to={ruta}
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            />
          ) : null}

          <Icono className="size-5" />
          <span className="flex-1">{etiqueta}</span>

          {muestraContador ? (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-caption font-bold text-surface">
              {pendientes}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}
