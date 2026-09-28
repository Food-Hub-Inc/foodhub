import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, toast } from '@heroui/react';
import {
  MENSAJES_AYUDA,
  type CapituloAyudaListado,
  type EstadoHabilitacionAyuda,
  type RolDestinoAyuda,
} from '@foodhub/shared';
import {
  FILTROS_MANUAL_INICIALES,
  claveListadoCapitulos,
  habilitarCapitulo,
  hayFiltrosDeManual,
  listarCapitulos,
  type FiltrosManual,
} from '../../../api/ayuda.js';
import { EsqueletoDeTabla } from '../../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../../components/estados/EstadoVacio.js';
import {
  IconoAgregar,
  IconoBandeja,
} from '../../../components/iconos/index.js';
import { useOperacionDeAyuda } from '../../../hooks/useOperacionDeAyuda.js';
import { mensajeDeError } from '../../../lib/api.js';
import { RUTAS, rutaEditarCapitulo } from '../../../lib/rutas.js';
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';
import { PieDelListado } from '../PieDelListado.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DialogosDelManual } from './DialogosDelManual.js';
import { TablaDeCapitulos } from './TablaDeCapitulos.js';

/**
 * Solapa "Manual de usuario" de "Gestión de ayuda" — US-AYU-05.
 *
 * El alta y la edición navegan a `PaginaDeCapitulo`; acá solo queda el diálogo
 * de baja lógica.
 */
export function PanelDelManual() {
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosManual>(
    FILTROS_MANUAL_INICIALES,
  );
  const [aDeshabilitar, setADeshabilitar] =
    useState<CapituloAyudaListado | null>(null);

  const consulta = useQuery({
    queryKey: claveListadoCapitulos(filtros),
    queryFn: () => listarCapitulos(filtros),
  });

  const habilitacion = useOperacionDeAyuda({
    ejecutar: (id: string) => habilitarCapitulo(id),
    mensajeExito: MENSAJES_AYUDA.admin.capituloHabilitado,
    alTerminar: () => {
      // Acción inmediata: no hay diálogo que cerrar.
    },
  });

  function aplicarFiltro(cambio: Partial<FiltrosManual>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  const total = consulta.data?.total ?? 0;
  const capitulos = consulta.data?.datos ?? [];

  return (
    <>
      <BarraDeAcciones
        alCrear={() => {
          void navegar(RUTAS.ayudaNuevoCapitulo);
        }}
        cargando={consulta.isPending}
        total={total}
      />

      <BarraDeFiltros
        alCambiarEstado={(estado: EstadoHabilitacionAyuda | null) => {
          aplicarFiltro({ estado });
        }}
        alCambiarRol={(rolDestino: RolDestinoAyuda | null) => {
          aplicarFiltro({ rolDestino });
        }}
        estado={filtros.estado}
        rolDestino={filtros.rolDestino}
      />

      <Contenido
        alDeshabilitar={setADeshabilitar}
        alEditar={(capitulo) => {
          void navegar(rutaEditarCapitulo(capitulo.id));
        }}
        alHabilitar={(capitulo) => {
          habilitacion.mutate(capitulo.id, {
            onError: (error) => {
              toast.danger(mensajeDeError(error));
            },
          });
        }}
        alLimpiarFiltros={() => {
          setFiltros(FILTROS_MANUAL_INICIALES);
        }}
        capitulos={capitulos}
        consulta={consulta}
        filtros={filtros}
      />

      <PieDelListado
        alCambiarPagina={(pagina) => {
          setFiltros((previo) => ({ ...previo, pagina }));
        }}
        cantidadEnPagina={capitulos.length}
        pagina={filtros.pagina}
        porPagina={filtros.porPagina}
        sustantivo="capítulos"
        total={total}
      />

      <DialogosDelManual
        alCerrar={() => {
          setADeshabilitar(null);
        }}
        capitulo={aDeshabilitar}
      />
    </>
  );
}

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
        {cargando ? ' ' : `${String(total)} capítulos registrados`}
      </p>
      <Button onPress={alCrear}>
        <IconoAgregar className="size-4" />
        {MENSAJES_AYUDA.admin.nuevoCapitulo}
      </Button>
    </div>
  );
}

function Contenido({
  consulta,
  capitulos,
  filtros,
  alEditar,
  alDeshabilitar,
  alLimpiarFiltros,
  alHabilitar,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  capitulos: readonly CapituloAyudaListado[];
  filtros: FiltrosManual;
  alEditar: (capitulo: CapituloAyudaListado) => void;
  alDeshabilitar: (capitulo: CapituloAyudaListado) => void;
  alLimpiarFiltros: () => void;
  alHabilitar: (capitulo: CapituloAyudaListado) => void;
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

  if (capitulos.length === 0) {
    const conFiltros = hayFiltrosDeManual(filtros);
    return (
      <EstadoVacio
        {...(conFiltros
          ? {
              accion: {
                etiqueta: TEXTOS_GESTION_AYUDA.limpiarFiltros,
                alPresionar: alLimpiarFiltros,
              },
            }
          : {})}
        icono={<IconoBandeja className="size-7" />}
        mensaje={
          conFiltros
            ? TEXTOS_GESTION_AYUDA.vacioManualConFiltros
            : TEXTOS_GESTION_AYUDA.vacioManualSinFiltros
        }
      />
    );
  }

  return (
    <TablaDeCapitulos
      acciones={{
        editar: alEditar,
        habilitar: alHabilitar,
        deshabilitar: alDeshabilitar,
      }}
      capitulos={capitulos}
    />
  );
}
