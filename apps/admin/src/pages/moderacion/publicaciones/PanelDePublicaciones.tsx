import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MENSAJES_MODERACION,
  type EstadoPublicacion,
  type PublicacionAdmin,
} from '@foodhub/shared';
import {
  claveListadoPublicaciones,
  FILTROS_INICIALES,
  hayFiltrosAplicados,
  listarPublicaciones,
  type FiltrosListado,
} from '../../../api/moderacionPublicaciones.js';
import { EsqueletoDeTabla } from '../../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../../components/estados/EstadoVacio.js';
import { IconoModeracion } from '../../../components/iconos/index.js';
import { PaginacionDeTabla } from '../../../components/PaginacionDeTabla.js';
import { useValorDebounced } from '../../../hooks/useValorDebounced.js';
import { formatearNumero, rangoVisible } from '../../../lib/formato.js';
import {
  TEXTOS_ESTADO,
  TEXTOS_MODERACION_PUBLICACIONES as TEXTOS,
} from '../../../lib/textos.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DetalleDePublicacion } from './DetalleDePublicacion.js';
import { DialogoDeEliminacion } from './DialogoDeEliminacion.js';
import { TablaDePublicaciones } from './TablaDePublicaciones.js';

/**
 * Pestaña "Publicaciones" de PAN-ADM-02 — US-ADM-04.
 *
 * Coordina y no implementa: el listado se pide acá, y el detalle y la baja son
 * dos diálogos que se hacen cargo de lo suyo. Se abre uno a la vez: el detalle
 * cede el lugar al de eliminación cuando el administrador decide dar de baja.
 */
type Abierto =
  | { tipo: 'ninguno' }
  | { tipo: 'detalle'; id: string }
  | {
      tipo: 'eliminacion';
      publicacion: Pick<PublicacionAdmin, 'id' | 'nombre'>;
    };

const NINGUNO: Abierto = { tipo: 'ninguno' };

export function PanelDePublicaciones() {
  const [filtros, setFiltros] = useState<FiltrosListado>(FILTROS_INICIALES);
  const [abierto, setAbierto] = useState<Abierto>(NINGUNO);

  // Mismo criterio que PAN-ADM-01: solo la búsqueda espera a que se deje de
  // escribir; un desplegable cambia una vez por elección.
  const busquedaDiferida = useValorDebounced(filtros.busqueda);
  const efectivos: FiltrosListado = { ...filtros, busqueda: busquedaDiferida };

  const consulta = useQuery({
    queryKey: claveListadoPublicaciones(efectivos),
    queryFn: () => listarPublicaciones(efectivos),
  });

  function aplicarFiltro(cambio: Partial<FiltrosListado>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  const total = consulta.data?.total ?? 0;
  const publicaciones = consulta.data?.datos ?? [];

  return (
    <div className="space-y-4">
      <p className="text-body text-text-secondary">
        {consulta.data ? TEXTOS.resumen(total) : TEXTOS_ESTADO.cargando}
      </p>

      <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
        <BarraDeFiltros
          alCambiarBusqueda={(busqueda) => {
            aplicarFiltro({ busqueda });
          }}
          alCambiarCategoria={(categoriaId) => {
            aplicarFiltro({ categoriaId });
          }}
          alCambiarEstado={(estadoPublicacion: EstadoPublicacion | null) => {
            aplicarFiltro({ estadoPublicacion });
          }}
          busqueda={filtros.busqueda}
          categoriaId={filtros.categoriaId}
          estadoPublicacion={filtros.estadoPublicacion}
        />

        <Contenido
          alEliminar={(publicacion) => {
            setAbierto({ tipo: 'eliminacion', publicacion });
          }}
          alLimpiarFiltros={() => {
            setFiltros(FILTROS_INICIALES);
          }}
          alVerDetalle={(id) => {
            setAbierto({ tipo: 'detalle', id });
          }}
          conFiltros={hayFiltrosAplicados(efectivos)}
          consulta={consulta}
          publicaciones={publicaciones}
        />

        <PieDelListado
          alCambiarPagina={(pagina) => {
            setFiltros((previo) => ({ ...previo, pagina }));
          }}
          cantidadEnPagina={publicaciones.length}
          pagina={filtros.pagina}
          porPagina={filtros.porPagina}
          total={total}
        />
      </section>

      <Dialogos abierto={abierto} alCambiar={setAbierto} />
    </div>
  );
}

/** Los cuatro estados: error, carga, vacío y la tabla. */
function Contenido({
  consulta,
  publicaciones,
  conFiltros,
  alVerDetalle,
  alEliminar,
  alLimpiarFiltros,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  publicaciones: readonly PublicacionAdmin[];
  conFiltros: boolean;
  alVerDetalle: (id: string) => void;
  alEliminar: (publicacion: PublicacionAdmin) => void;
  alLimpiarFiltros: () => void;
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

  if (consulta.isPending) return <EsqueletoDeTabla columnas={7} conAvatar />;

  if (publicaciones.length === 0) {
    return (
      <EstadoVacio
        {...(conFiltros
          ? {
              accion: {
                etiqueta: TEXTOS.limpiarFiltros,
                alPresionar: alLimpiarFiltros,
              },
            }
          : {})}
        icono={<IconoModeracion className="size-7" />}
        mensaje={
          conFiltros
            ? MENSAJES_MODERACION.sinPublicaciones
            : TEXTOS.vacioSinFiltros
        }
      />
    );
  }

  return (
    <TablaDePublicaciones
      alEliminar={alEliminar}
      alVerDetalle={alVerDetalle}
      publicaciones={publicaciones}
    />
  );
}

/** El detalle o el diálogo de baja, según lo que esté abierto. */
function Dialogos({
  abierto,
  alCambiar,
}: {
  abierto: Abierto;
  alCambiar: (abierto: Abierto) => void;
}) {
  const cerrar = () => {
    alCambiar(NINGUNO);
  };

  if (abierto.tipo === 'detalle') {
    return (
      <DetalleDePublicacion
        alCerrar={cerrar}
        alEliminar={(publicacion) => {
          alCambiar({ tipo: 'eliminacion', publicacion });
        }}
        id={abierto.id}
      />
    );
  }

  if (abierto.tipo === 'eliminacion') {
    return (
      <DialogoDeEliminacion
        alCerrar={cerrar}
        key={abierto.publicacion.id}
        publicacion={abierto.publicacion}
      />
    );
  }

  return null;
}

/** "Mostrando 1–20 de 132 publicaciones" y la paginación; nada si está vacío. */
function PieDelListado({
  pagina,
  porPagina,
  total,
  cantidadEnPagina,
  alCambiarPagina,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  cantidadEnPagina: number;
  alCambiarPagina: (pagina: number) => void;
}) {
  const rango = rangoVisible(pagina, porPagina, cantidadEnPagina);
  if (!rango) return null;

  return (
    <PaginacionDeTabla
      alCambiarPagina={alCambiarPagina}
      pagina={pagina}
      porPagina={porPagina}
      resumen={`Mostrando ${formatearNumero(rango.desde)}–${formatearNumero(rango.hasta)} de ${formatearNumero(total)} publicaciones`}
      total={total}
    />
  );
}
