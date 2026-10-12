import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  obtenerReportesPendientes,
  resolverReporte,
} from '../../api/moderacion.js';
import { EsqueletoDeTabla } from '../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../components/estados/EstadoVacio.js';
import { IconoModeracion } from '../../components/iconos/index.js';
import { PaginacionDeTabla } from '../../components/PaginacionDeTabla.js';
import { mensajeDeError } from '../../lib/api.js';
import { TEXTOS_ESTADO, TEXTOS_MODERACION } from '../../lib/textos.js';
import { FichaDeReporte } from './FichaDeReporte.js';
import { DialogoDeResolucion } from './DialogoDeResolucion.js';

/**
 * PAN-ADM-02, pestaña "Reseñas reportadas" — US-RES-06 y RF086.
 *
 * SE LISTAN RESEÑAS REPORTADAS, NO REPORTES SUELTOS. Una reseña denunciada por
 * cinco personas es una fila con cinco motivos, no cinco filas: la decisión que
 * el administrador tiene que tomar es sobre la reseña —ocultarla o dejarla— y
 * es una sola, por más denuncias que haya recibido.
 *
 * NO ES UNA TABLA sino una lista de fichas, a diferencia de Usuarios y
 * Auditoría. Cada fila trae el texto de la reseña, su foto, los motivos y los
 * detalles que escribió cada denunciante: no hay forma de leer eso en columnas
 * sin recortar justamente lo que hace falta para decidir.
 */
export function PanelDeResenas() {
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const consulta = useQuery({
    queryKey: ['moderacion', 'reportes', pagina, porPagina],
    queryFn: () => obtenerReportesPendientes({ pagina, porPagina }),
  });

  const resolucion = useResolucion();
  const total = consulta.data?.total ?? 0;

  return (
    <>
      <div className="space-y-4">
        <p className="text-body text-text-secondary">
          {consulta.data
            ? TEXTOS_MODERACION.resumen(total)
            : TEXTOS_ESTADO.cargando}
        </p>

        {/*
          RF086 exige notificar en las dos ramas y todavía no se puede. Se dice
          en pantalla en lugar de callarlo: el administrador tiene que saber que
          si oculta una reseña, el autor no se entera por la aplicación.
        */}
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-caption text-text-secondary">
          {TEXTOS_MODERACION.avisoSinNotificaciones}
        </p>

        <Contenido
          alResolver={resolucion.pedir}
          consulta={consulta}
          resolviendo={resolucion.resenaEnCurso}
        />

        {total > porPagina ? (
          <PaginacionDeTabla
            alCambiarPagina={setPagina}
            pagina={pagina}
            porPagina={porPagina}
            resumen={TEXTOS_MODERACION.resumen(total)}
            total={total}
          />
        ) : null}
      </div>

      <DialogoDeResolucion
        alCancelar={resolucion.cancelar}
        alConfirmar={resolucion.confirmar}
        error={resolucion.error}
        pendiente={resolucion.pendiente}
        peticion={resolucion.peticion}
      />
    </>
  );
}

/** Los cuatro estados: error, carga, vacío y la lista. */
function Contenido({
  consulta,
  alResolver,
  resolviendo,
}: {
  consulta: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof obtenerReportesPendientes>>>
  >;
  alResolver: (resenaId: string, aprobar: boolean) => void;
  resolviendo: string | null;
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

  if (!consulta.data) return <EsqueletoDeTabla columnas={1} filas={3} />;

  if (consulta.data.datos.length === 0) {
    return (
      <EstadoVacio
        icono={<IconoModeracion className="size-7" />}
        mensaje={TEXTOS_MODERACION.sinPendientes}
      />
    );
  }

  return (
    <ul className="space-y-4">
      {consulta.data.datos.map((reporte) => (
        <li key={reporte.resenaId}>
          <FichaDeReporte
            alResolver={alResolver}
            procesando={resolviendo === reporte.resenaId}
            reporte={reporte}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * La confirmación y el envío de las dos ramas.
 *
 * `peticion` guarda qué se está por hacer y sobre cuál reseña; con `null` el
 * diálogo está cerrado. Se confirma antes de ejecutar porque las dos ramas son
 * difíciles de deshacer: ocultar una reseña la saca de dos promedios, y
 * dejarla visible cierra los reportes para siempre.
 */
function useResolucion() {
  const cliente = useQueryClient();
  const [peticion, setPeticion] = useState<{
    resenaId: string;
    aprobar: boolean;
  } | null>(null);

  const mutacion = useMutation({
    mutationFn: resolverReporte,
    onSuccess: () => {
      setPeticion(null);
      void cliente.invalidateQueries({ queryKey: ['moderacion'] });
    },
  });

  return {
    peticion,
    pendiente: mutacion.isPending,
    error: mutacion.isError ? mensajeDeError(mutacion.error) : null,
    resenaEnCurso: mutacion.isPending ? (peticion?.resenaId ?? null) : null,
    pedir: (resenaId: string, aprobar: boolean) => {
      mutacion.reset();
      setPeticion({ resenaId, aprobar });
    },
    cancelar: () => {
      setPeticion(null);
    },
    confirmar: () => {
      if (peticion) mutacion.mutate(peticion);
    },
  };
}
