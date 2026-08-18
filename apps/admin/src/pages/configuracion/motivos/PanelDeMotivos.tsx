import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, toast } from '@heroui/react';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import type {
  EstadoHabilitacionMotivo,
  MotivoCancelacionListado,
  TipoUsuarioCancelacion,
} from '@foodhub/shared';
import {
  claveListadoMotivos,
  FILTROS_INICIALES,
  habilitarMotivoCancelacion,
  hayFiltrosAplicados,
  listarMotivosCancelacion,
  type FiltrosListado,
} from '../../../api/motivosCancelacion.js';
import { EsqueletoDeTabla } from '../../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../../components/estados/EstadoVacio.js';
import {
  IconoAgregar,
  IconoBandeja,
} from '../../../components/iconos/index.js';
import { useOperacionDeMotivo } from '../../../hooks/useOperacionDeMotivo.js';
import { mensajeDeError } from '../../../lib/api.js';
import { TEXTOS_MOTIVOS } from '../../../lib/textos.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DialogosDeMotivos } from './DialogosDeMotivos.js';
import { PieDelListado } from './PieDelListado.js';
import { TablaDeMotivos } from './TablaDeMotivos.js';
import { SIN_DIALOGOS, type DialogosAbiertos } from './dialogos/estado.js';

/**
 * Solapa "Motivos de cancelación" de PAN-ADM-04 — US-CFG-02. Mismo diseño
 * que `PanelDeCategorias.tsx`: habilitar no abre diálogo, se aplica de
 * inmediato.
 */
export function PanelDeMotivos() {
  const [filtros, setFiltros] = useState<FiltrosListado>(FILTROS_INICIALES);
  const [dialogos, setDialogos] = useState<DialogosAbiertos>(SIN_DIALOGOS);

  const consulta = useQuery({
    queryKey: claveListadoMotivos(filtros),
    queryFn: () => listarMotivosCancelacion(filtros),
  });

  const habilitacion = useOperacionDeMotivo({
    ejecutar: (id: string) => habilitarMotivoCancelacion(id),
    mensajeExito: MENSAJES_CONFIGURACION.motivoHabilitado,
    alTerminar: () => {
      // No hay diálogo que cerrar: la acción es inmediata.
    },
  });

  function aplicarFiltro(cambio: Partial<FiltrosListado>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  function alHabilitar(motivo: MotivoCancelacionListado) {
    habilitacion.mutate(motivo.id, {
      onError: (error) => {
        toast.danger(mensajeDeError(error));
      },
    });
  }

  const total = consulta.data?.total ?? 0;
  const motivos = consulta.data?.datos ?? [];

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
        alCambiarAplicableA={(aplicableA: TipoUsuarioCancelacion | null) => {
          aplicarFiltro({ aplicableA });
        }}
        alCambiarEstado={(estado: EstadoHabilitacionMotivo | null) => {
          aplicarFiltro({ estado });
        }}
        aplicableA={filtros.aplicableA}
        estado={filtros.estado}
      />

      <Contenido
        alAbrirDialogo={setDialogos}
        alHabilitar={alHabilitar}
        alLimpiarFiltros={() => {
          setFiltros(FILTROS_INICIALES);
        }}
        consulta={consulta}
        filtros={filtros}
        motivos={motivos}
      />

      <PieDelListado
        alCambiarPagina={(pagina) => {
          setFiltros((previo) => ({ ...previo, pagina }));
        }}
        cantidadEnPagina={motivos.length}
        pagina={filtros.pagina}
        porPagina={filtros.porPagina}
        total={total}
      />

      <DialogosDeMotivos
        alCerrar={() => {
          setDialogos(SIN_DIALOGOS);
        }}
        dialogos={dialogos}
      />
    </>
  );
}

/** Contador y el botón "Crear" de US-CFG-02. */
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
        {cargando ? ' ' : `${String(total)} motivos registrados`}
      </p>
      <Button onPress={alCrear}>
        <IconoAgregar className="size-4" />
        {TEXTOS_MOTIVOS.nuevo}
      </Button>
    </div>
  );
}

function Contenido({
  consulta,
  motivos,
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
  motivos: readonly MotivoCancelacionListado[];
  filtros: FiltrosListado;
  alAbrirDialogo: (dialogos: DialogosAbiertos) => void;
  alLimpiarFiltros: () => void;
  alHabilitar: (motivo: MotivoCancelacionListado) => void;
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

  if (motivos.length === 0) {
    return (
      <ListadoVacio
        alLimpiarFiltros={alLimpiarFiltros}
        conFiltros={hayFiltrosAplicados(filtros)}
      />
    );
  }

  return (
    <TablaDeMotivos
      acciones={{
        editar: (motivo) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, edicion: motivo });
        },
        habilitar: alHabilitar,
        deshabilitar: (motivo) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, deshabilitacion: motivo });
        },
      }}
      motivos={motivos}
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
              etiqueta: TEXTOS_MOTIVOS.limpiarFiltros,
              alPresionar: alLimpiarFiltros,
            },
          }
        : {})}
      icono={<IconoBandeja className="size-7" />}
      mensaje={
        conFiltros
          ? TEXTOS_MOTIVOS.vacioConFiltros
          : TEXTOS_MOTIVOS.vacioSinFiltros
      }
    />
  );
}
