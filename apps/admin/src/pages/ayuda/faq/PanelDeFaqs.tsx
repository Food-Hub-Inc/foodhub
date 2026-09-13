import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, toast } from '@heroui/react';
import {
  MENSAJES_AYUDA,
  type EstadoHabilitacionAyuda,
  type FaqAdminListado,
  type RolDestinoAyuda,
} from '@foodhub/shared';
import {
  FILTROS_FAQ_INICIALES,
  claveListadoFaqs,
  habilitarFaq,
  hayFiltrosDeFaqs,
  listarFaqs,
  type FiltrosFaqs,
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
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';
import { PieDelListado } from '../PieDelListado.js';
import {
  SIN_DIALOGOS_FAQ,
  type DialogosDeFaqs as Dialogos,
} from '../dialogos/estado.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DialogosDeFaqs } from './DialogosDeFaqs.js';
import { TablaDeFaqs } from './TablaDeFaqs.js';

/** Solapa "Preguntas frecuentes" de "Gestión de ayuda" — US-AYU-05. */
export function PanelDeFaqs() {
  const [filtros, setFiltros] = useState<FiltrosFaqs>(FILTROS_FAQ_INICIALES);
  const [dialogos, setDialogos] = useState<Dialogos>(SIN_DIALOGOS_FAQ);

  const consulta = useQuery({
    queryKey: claveListadoFaqs(filtros),
    queryFn: () => listarFaqs(filtros),
  });

  const habilitacion = useOperacionDeAyuda({
    ejecutar: (id: string) => habilitarFaq(id),
    mensajeExito: MENSAJES_AYUDA.admin.faqHabilitada,
    alTerminar: () => {
      // Acción inmediata: no hay diálogo que cerrar.
    },
  });

  function aplicarFiltro(cambio: Partial<FiltrosFaqs>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  const total = consulta.data?.total ?? 0;
  const faqs = consulta.data?.datos ?? [];

  return (
    <>
      <BarraDeAcciones
        alCrear={() => {
          setDialogos({ ...SIN_DIALOGOS_FAQ, alta: true });
        }}
        cargando={consulta.isPending}
        total={total}
      />

      <BarraDeFiltros
        alCambiarCategoria={(categoria: string | null) => {
          aplicarFiltro({ categoria });
        }}
        alCambiarEstado={(estado: EstadoHabilitacionAyuda | null) => {
          aplicarFiltro({ estado });
        }}
        alCambiarRol={(rolDestino: RolDestinoAyuda | null) => {
          aplicarFiltro({ rolDestino });
        }}
        categoria={filtros.categoria}
        estado={filtros.estado}
        rolDestino={filtros.rolDestino}
      />

      <Contenido
        alAbrirDialogo={setDialogos}
        alHabilitar={(faq) => {
          habilitacion.mutate(faq.id, {
            onError: (error) => {
              toast.danger(mensajeDeError(error));
            },
          });
        }}
        alLimpiarFiltros={() => {
          setFiltros(FILTROS_FAQ_INICIALES);
        }}
        consulta={consulta}
        faqs={faqs}
        filtros={filtros}
      />

      <PieDelListado
        alCambiarPagina={(pagina) => {
          setFiltros((previo) => ({ ...previo, pagina }));
        }}
        cantidadEnPagina={faqs.length}
        pagina={filtros.pagina}
        porPagina={filtros.porPagina}
        sustantivo="preguntas"
        total={total}
      />

      <DialogosDeFaqs
        alCerrar={() => {
          setDialogos(SIN_DIALOGOS_FAQ);
        }}
        dialogos={dialogos}
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
        {cargando ? ' ' : `${String(total)} preguntas registradas`}
      </p>
      <Button onPress={alCrear}>
        <IconoAgregar className="size-4" />
        {MENSAJES_AYUDA.admin.nuevaPregunta}
      </Button>
    </div>
  );
}

function Contenido({
  consulta,
  faqs,
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
  faqs: readonly FaqAdminListado[];
  filtros: FiltrosFaqs;
  alAbrirDialogo: (dialogos: Dialogos) => void;
  alLimpiarFiltros: () => void;
  alHabilitar: (faq: FaqAdminListado) => void;
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

  if (faqs.length === 0) {
    const conFiltros = hayFiltrosDeFaqs(filtros);
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
            ? TEXTOS_GESTION_AYUDA.vacioFaqConFiltros
            : TEXTOS_GESTION_AYUDA.vacioFaqSinFiltros
        }
      />
    );
  }

  return (
    <TablaDeFaqs
      acciones={{
        editar: (faq) => {
          alAbrirDialogo({ ...SIN_DIALOGOS_FAQ, edicion: faq });
        },
        habilitar: alHabilitar,
        deshabilitar: (faq) => {
          alAbrirDialogo({ ...SIN_DIALOGOS_FAQ, deshabilitacion: faq });
        },
      }}
      faqs={faqs}
    />
  );
}
