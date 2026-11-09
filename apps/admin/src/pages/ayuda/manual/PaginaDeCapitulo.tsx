import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@heroui/react';
import { MENSAJES_AYUDA, type CapituloAyudaListado } from '@foodhub/shared';
import { claveCapitulo, obtenerCapitulo } from '../../../api/ayuda.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { EsqueletoDeTabla } from '../../../components/estados/EsqueletoDeTabla.js';
import { EncabezadoPantalla } from '../../../components/layout/EncabezadoPantalla.js';
import { IconoChevronIzquierda } from '../../../components/iconos/index.js';
import { RUTAS } from '../../../lib/rutas.js';
import { TEXTOS_GESTION_AYUDA } from '../../../lib/textos.js';
import { FormularioDeCapitulo } from './FormularioDeCapitulo.js';

/**
 * Página de alta y edición de un capítulo del manual — US-AYU-05.
 *
 * La edición se hace acá y no en un modal porque el contenido (varias
 * secciones con editor enriquecido) es largo. Se accede por
 * `/ayuda/capitulos/nuevo` y `/ayuda/capitulos/:id/editar`.
 */
export function PaginaDeCapitulo() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const esEdicion = Boolean(id);

  const consulta = useQuery({
    queryKey: claveCapitulo(id ?? 'nuevo'),
    queryFn: () => obtenerCapitulo(id ?? ''),
    enabled: esEdicion,
  });

  function volver() {
    void navegar(RUTAS.ayuda);
  }

  return (
    <>
      <EncabezadoPantalla
        acciones={
          <Button onPress={volver} variant="tertiary">
            <IconoChevronIzquierda className="size-4" />
            {TEXTOS_GESTION_AYUDA.volver}
          </Button>
        }
        subtitulo={TEXTOS_GESTION_AYUDA.subtituloFormularioCapitulo}
        titulo={
          esEdicion
            ? TEXTOS_GESTION_AYUDA.dialogoEdicionCapituloTitulo
            : MENSAJES_AYUDA.admin.nuevoCapitulo
        }
      />

      <div className="p-8">
        <Contenido
          alCancelar={volver}
          alGuardar={volver}
          capitulo={consulta.data}
          consulta={consulta}
          esEdicion={esEdicion}
        />
      </div>
    </>
  );
}

function Contenido({
  esEdicion,
  consulta,
  capitulo,
  alGuardar,
  alCancelar,
}: {
  esEdicion: boolean;
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  capitulo: CapituloAyudaListado | undefined;
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  if (esEdicion && consulta.isError) {
    return (
      <Marco>
        <EstadoError
          alReintentar={() => {
            void consulta.refetch();
          }}
          error={consulta.error}
        />
      </Marco>
    );
  }

  if (esEdicion && consulta.isPending) {
    return (
      <Marco>
        <EsqueletoDeTabla columnas={1} filas={6} />
      </Marco>
    );
  }

  return (
    <Marco>
      <FormularioDeCapitulo
        alCancelar={alCancelar}
        alGuardar={alGuardar}
        {...(capitulo ? { capitulo } : {})}
      />
    </Marco>
  );
}

/** Tarjeta que contiene el formulario, igual que las tablas del panel. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
      {children}
    </section>
  );
}
