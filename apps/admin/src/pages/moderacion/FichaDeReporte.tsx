import { Button } from '@heroui/react';
import type { ReporteModeracion, ResolucionAnterior } from '@foodhub/shared';
import { Insignia } from '../../components/Insignia.js';
import { formatearFecha, formatearFechaHora } from '../../lib/formato.js';
import { TEXTOS_MODERACION } from '../../lib/textos.js';

/**
 * Una reseña reportada, con todo lo que hace falta para decidir — RF086.
 *
 * "Por cada reporte el sistema muestra la reseña original, el autor, la
 * publicación y el cocinero a los que corresponde, la cantidad de reportes
 * acumulados, los motivos seleccionados y los detalles adicionales aportados."
 * Los siete datos están, y en ese orden: primero cuánta gente la denunció,
 * después qué dice la reseña, y al final por qué la denunciaron.
 */
export function FichaDeReporte({
  reporte,
  procesando,
  alResolver,
}: {
  reporte: ReporteModeracion;
  procesando: boolean;
  alResolver: (resenaId: string, aprobar: boolean) => void;
}) {
  return (
    <article className="aparece space-y-4 rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Insignia tono="rojo">
            {TEXTOS_MODERACION.cantidadReportes(reporte.cantidadReportes)}
          </Insignia>
          {reporte.historial.length === 0 ? null : (
            <Insignia tono="ambar">
              {TEXTOS_MODERACION.reportadaNuevamente}
            </Insignia>
          )}
        </div>

        <p className="text-caption text-text-secondary">
          {`${TEXTOS_MODERACION.primerReporte}: ${formatearFecha(reporte.fechaPrimerReporte)}`}
        </p>
      </header>

      <ResenaDenunciada resena={reporte.resena} />
      <MotivosYDetalles reporte={reporte} />
      <HistorialDeModeracion historial={reporte.historial} />

      <footer className="flex flex-wrap justify-end gap-3">
        {/*
          "Ocultar" va en rojo y "Dejarla visible" en secundario: la primera
          cambia el estado de la reseña y mueve dos promedios; la segunda deja
          todo como está. La jerarquía visual tiene que reflejar cuál de las dos
          hace algo.
        */}
        <Button
          isDisabled={procesando}
          onPress={() => {
            alResolver(reporte.resenaId, false);
          }}
          variant="tertiary"
        >
          {TEXTOS_MODERACION.mantener}
        </Button>

        <Button
          isDisabled={procesando}
          onPress={() => {
            alResolver(reporte.resenaId, true);
          }}
          variant="danger"
        >
          {TEXTOS_MODERACION.ocultar}
        </Button>
      </footer>
    </article>
  );
}

/**
 * La reseña original: de qué tipo es, quién la escribió, sobre quién o qué,
 * cuántas estrellas y qué dijo.
 *
 * EL TIPO VA PRIMERO Y NO ES DECORACIÓN. Desde que las tres reseñas comparten
 * tabla, la cola trae reportes sobre reseñas de un plato y sobre opiniones
 * acerca de un cocinero, y se moderan con criterios distintos: ocultar la
 * primera saca una opinión sobre comida, ocultar la segunda saca una sobre una
 * persona. Sin el rótulo, el administrador no sabe cuál de las dos está por
 * ocultar.
 *
 * Las dos líneas de contexto son condicionales por lo mismo: una opinión sobre
 * un cocinero no tiene plato, y antes esta ficha las daba por hechas.
 */
function ResenaDenunciada({ resena }: { resena: ReporteModeracion['resena'] }) {
  return (
    <div className="space-y-2 rounded-md bg-background p-4">
      <span className="inline-block rounded-full bg-surface px-2.5 py-1 text-caption font-semibold text-text-secondary">
        {TEXTOS_MODERACION.tipoDeResena[resena.tipo]}
      </span>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-caption text-text-secondary">
        <span>{`${TEXTOS_MODERACION.autor}: ${resena.autorNombre}`}</span>
        {resena.nombrePlato === null ? null : (
          <span>{`${TEXTOS_MODERACION.plato}: ${resena.nombrePlato}`}</span>
        )}
        {resena.cocineroNombre === null ? null : (
          <span>{`${TEXTOS_MODERACION.cocinero}: ${resena.cocineroNombre}`}</span>
        )}
      </div>

      <p className="text-body font-bold text-warning">
        {'★'.repeat(resena.calificacion)}
        <span className="text-text-disabled">
          {'★'.repeat(5 - resena.calificacion)}
        </span>
      </p>

      <p className="text-body text-text-primary">
        {resena.comentario ?? TEXTOS_MODERACION.sinComentario}
      </p>

      {resena.fotoUrl === null ? null : (
        <img
          alt=""
          className="max-h-48 rounded-md object-cover"
          src={resena.fotoUrl}
        />
      )}

      <p className="text-caption text-text-disabled">
        {formatearFecha(resena.fechaPublicacion)}
      </p>
    </div>
  );
}

/**
 * Por qué la denunciaron.
 *
 * Los motivos vienen deduplicados del servidor: si cinco personas eligieron
 * "Spam", aparece una vez. Los detalles NO se deduplican, porque cada uno lo
 * escribió una persona distinta y decir dos veces lo mismo con otras palabras
 * es en sí un dato para quien modera.
 */
function MotivosYDetalles({ reporte }: { reporte: ReporteModeracion }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-caption font-bold uppercase text-text-secondary">
          {TEXTOS_MODERACION.motivos}
        </p>
        <div className="flex flex-wrap gap-2">
          {reporte.motivos.map((motivo) => (
            <Insignia key={motivo} tono="neutro">
              {motivo}
            </Insignia>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-caption font-bold uppercase text-text-secondary">
          {TEXTOS_MODERACION.detalles}
        </p>
        {reporte.detalles.length === 0 ? (
          <p className="text-caption text-text-disabled">
            {TEXTOS_MODERACION.sinDetalles}
          </p>
        ) : (
          <ul className="space-y-1">
            {reporte.detalles.map((detalle, indice) => (
              <li
                className="border-l-2 border-border pl-3 text-body text-text-primary"
                // Dos personas pueden escribir exactamente lo mismo, así que el
                // texto no sirve como clave y el índice es lo único estable.
                key={`${String(indice)}-${detalle.slice(0, 12)}`}
              >
                {detalle}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Qué se decidió antes sobre esta reseña — corrección del 20/10/2026.
 *
 * Una ronda por cada vez que se resolvió: la decisión, quién la tomó y cuándo,
 * y las denuncias que la motivaron con quién las hizo. La más reciente arriba,
 * porque es la que el administrador está por confirmar o revertir.
 *
 * QUIÉN DENUNCIÓ SE MUESTRA ACÁ Y NO EN LAS DENUNCIAS PENDIENTES. En el
 * historial sirve para ver si es la misma persona la que insiste después de que
 * se le dio la razón al autor.
 */
function HistorialDeModeracion({
  historial,
}: {
  historial: ResolucionAnterior[];
}) {
  if (historial.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-caption font-bold uppercase text-text-secondary">
        {TEXTOS_MODERACION.historial}
      </p>

      <ol className="space-y-3">
        {historial.map((ronda) => (
          <li
            className="space-y-2 rounded-md border border-border p-3"
            key={ronda.fechaResolucion}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Insignia tono={ronda.decision === 'APROBADO' ? 'rojo' : 'verde'}>
                {TEXTOS_MODERACION.decisionAnterior[ronda.decision]}
              </Insignia>
              <span className="text-caption text-text-secondary">
                {TEXTOS_MODERACION.resueltaPor(
                  ronda.adminNombre,
                  formatearFechaHora(ronda.fechaResolucion),
                )}
              </span>
              <span className="text-caption text-text-disabled">
                {TEXTOS_MODERACION.denunciasDeLaRonda(ronda.denuncias.length)}
              </span>
            </div>

            <ul className="space-y-2">
              {ronda.denuncias.map((denuncia) => (
                <li
                  className="border-l-2 border-border pl-3"
                  key={`${denuncia.fechaReporte}-${denuncia.reportanteNombre}`}
                >
                  <p className="text-caption text-text-secondary">
                    {TEXTOS_MODERACION.reportadaPor(
                      denuncia.reportanteNombre,
                      formatearFechaHora(denuncia.fechaReporte),
                    )}
                  </p>
                  <p className="text-body text-text-primary">
                    {denuncia.motivos.join(', ')}
                  </p>
                  {denuncia.detalle === null ? null : (
                    <p className="text-caption text-text-secondary">
                      {denuncia.detalle}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
