import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, toast } from '@heroui/react';
import type {
  CategoriaListado,
  EstadoHabilitacionCategoria,
} from '@foodhub/shared';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import {
  claveListadoCategorias,
  FILTROS_INICIALES,
  habilitarCategoria,
  hayFiltrosAplicados,
  listarCategorias,
  type FiltrosListado,
} from '../../../api/categorias.js';
import { EsqueletoDeTabla } from '../../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../../components/estados/EstadoVacio.js';
import {
  IconoAgregar,
  IconoBandeja,
} from '../../../components/iconos/index.js';
import { useOperacionDeCategoria } from '../../../hooks/useOperacionDeCategoria.js';
import { useValorDebounced } from '../../../hooks/useValorDebounced.js';
import { mensajeDeError } from '../../../lib/api.js';
import { TEXTOS_CATEGORIAS } from '../../../lib/textos.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DialogosDeCategorias } from './DialogosDeCategorias.js';
import { PieDelListado } from './PieDelListado.js';
import { TablaDeCategorias } from './TablaDeCategorias.js';
import { SIN_DIALOGOS, type DialogosAbiertos } from './dialogos/estado.js';

/**
 * Solapa "Categorías de platos" de PAN-ADM-04 — US-CFG-01.
 *
 * La pantalla coordina; cada diálogo se hace cargo de su operación de punta a
 * punta. La excepción es habilitar: el criterio de aceptación pide que se
 * aplique "de forma inmediata... sin solicitar confirmación", así que esa
 * mutación vive acá y no abre ningún diálogo.
 */
export function PanelDeCategorias() {
  const [filtros, setFiltros] = useState<FiltrosListado>(FILTROS_INICIALES);
  const [dialogos, setDialogos] = useState<DialogosAbiertos>(SIN_DIALOGOS);

  const busquedaDiferida = useValorDebounced(filtros.busqueda);
  const filtrosEfectivos: FiltrosListado = {
    ...filtros,
    busqueda: busquedaDiferida,
  };

  const consulta = useQuery({
    queryKey: claveListadoCategorias(filtrosEfectivos),
    queryFn: () => listarCategorias(filtrosEfectivos),
  });

  const habilitacion = useOperacionDeCategoria({
    ejecutar: (id: string) => habilitarCategoria(id),
    mensajeExito: MENSAJES_CONFIGURACION.categoriaHabilitada,
    alTerminar: () => {
      // No hay diálogo que cerrar: la acción es inmediata.
    },
  });

  function aplicarFiltro(cambio: Partial<FiltrosListado>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  const total = consulta.data?.total ?? 0;
  const categorias = consulta.data?.datos ?? [];

  function alHabilitar(categoria: CategoriaListado) {
    habilitacion.mutate(categoria.id, {
      onError: (error) => {
        toast.danger(mensajeDeError(error));
      },
    });
  }

  return (
    <>
      <BarraDeAcciones
        alCrear={() => {
          setDialogos({ ...SIN_DIALOGOS, alta: true });
        }}
        cargando={consulta.isPending}
        total={total}
      />

      <BarraDeFiltros
        alCambiarBusqueda={(busqueda) => {
          aplicarFiltro({ busqueda });
        }}
        alCambiarEstado={(estado: EstadoHabilitacionCategoria | null) => {
          aplicarFiltro({ estado });
        }}
        busqueda={filtros.busqueda}
        estado={filtros.estado}
      />

      <Contenido
        alAbrirDialogo={setDialogos}
        alHabilitar={alHabilitar}
        alLimpiarFiltros={() => {
          setFiltros(FILTROS_INICIALES);
        }}
        categorias={categorias}
        consulta={consulta}
        filtros={filtrosEfectivos}
      />

      <PieDelListado
        alCambiarPagina={(pagina) => {
          setFiltros((previo) => ({ ...previo, pagina }));
        }}
        cantidadEnPagina={categorias.length}
        pagina={filtros.pagina}
        porPagina={filtros.porPagina}
        total={total}
      />

      <DialogosDeCategorias
        alCerrar={() => {
          setDialogos(SIN_DIALOGOS);
        }}
        dialogos={dialogos}
      />
    </>
  );
}

/** Título del listado, contador y el botón "Crear" de US-CFG-01. */
function BarraDeAcciones({
  total,
  cargando,
  alCrear,
}: {
  total: number;
  cargando: boolean;
  alCrear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <p className="text-label text-text-secondary">
        {cargando ? ' ' : `${String(total)} categorías registradas`}
      </p>
      <Button onPress={alCrear}>
        <IconoAgregar className="size-4" />
        {TEXTOS_CATEGORIAS.nuevo}
      </Button>
    </div>
  );
}

function Contenido({
  consulta,
  categorias,
  filtros,
  alAbrirDialogo,
  alLimpiarFiltros,
  alHabilitar,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  categorias: readonly CategoriaListado[];
  filtros: FiltrosListado;
  alAbrirDialogo: (dialogos: DialogosAbiertos) => void;
  alLimpiarFiltros: () => void;
  alHabilitar: (categoria: CategoriaListado) => void;
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

  if (consulta.isPending) return <EsqueletoDeTabla columnas={5} />;

  if (categorias.length === 0) {
    return (
      <ListadoVacio
        alLimpiarFiltros={alLimpiarFiltros}
        conFiltros={hayFiltrosAplicados(filtros)}
      />
    );
  }

  return (
    <TablaDeCategorias
      acciones={{
        editar: (categoria) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, edicion: categoria });
        },
        habilitar: alHabilitar,
        deshabilitar: (categoria) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, deshabilitacion: categoria });
        },
        eliminar: (categoria) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, eliminacion: categoria });
        },
      }}
      categorias={categorias}
    />
  );
}

function ListadoVacio({
  conFiltros,
  alLimpiarFiltros,
}: {
  conFiltros: boolean;
  alLimpiarFiltros: () => void;
}) {
  return (
    <EstadoVacio
      {...(conFiltros
        ? {
            accion: {
              etiqueta: TEXTOS_CATEGORIAS.limpiarFiltros,
              alPresionar: alLimpiarFiltros,
            },
          }
        : {})}
      icono={<IconoBandeja className="size-7" />}
      mensaje={
        conFiltros
          ? TEXTOS_CATEGORIAS.vacioConFiltros
          : TEXTOS_CATEGORIAS.vacioSinFiltros
      }
    />
  );
}
