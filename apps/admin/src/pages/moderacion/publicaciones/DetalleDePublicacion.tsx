import { useQuery } from '@tanstack/react-query';
import { Button, Spinner } from '@heroui/react';
import type { DetallePublicacionAdmin } from '@foodhub/shared';
import {
  CLAVE_PUBLICACIONES_ADMIN,
  obtenerPublicacion,
} from '../../../api/moderacionPublicaciones.js';
import { Dialogo } from '../../../components/Dialogo.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { InsigniaEstadoPublicacion } from '../../../components/InsigniasDelDominio.js';
import {
  formatearFecha,
  formatearPrecio,
  nombreCompleto,
} from '../../../lib/formato.js';
import { TEXTOS_MODERACION_PUBLICACIONES as TEXTOS } from '../../../lib/textos.js';
import { MiniaturaDePlato } from './MiniaturaDePlato.js';

/**
 * Detalle de una publicación — tercer criterio de US-ADM-04: "título,
 * descripción, imagen, precio, categoría, estado y cocinero asociado".
 *
 * Se pide aparte del listado porque la descripción (hasta 1000 caracteres) no
 * viaja en las filas: veinte descripciones por página serían peso muerto para
 * una tabla que no las muestra.
 */
export function DetalleDePublicacion({
  id,
  alCerrar,
  alEliminar,
}: {
  id: string;
  alCerrar: () => void;
  alEliminar: (publicacion: DetallePublicacionAdmin) => void;
}) {
  const consulta = useQuery({
    queryKey: [...CLAVE_PUBLICACIONES_ADMIN, 'detalle', id],
    queryFn: () => obtenerPublicacion(id),
  });

  const publicacion = consulta.data;

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      pie={
        <>
          <Button onPress={alCerrar} type="button" variant="tertiary">
            {TEXTOS.cerrar}
          </Button>
          <Button
            isDisabled={!publicacion}
            onPress={() => {
              if (publicacion) alEliminar(publicacion);
            }}
            type="button"
            variant="danger"
          >
            {TEXTOS.eliminar}
          </Button>
        </>
      }
      tamano="md"
      titulo={TEXTOS.detalleTitulo}
    >
      <Cuerpo
        alReintentar={() => {
          void consulta.refetch();
        }}
        consulta={consulta}
      />
    </Dialogo>
  );
}

function Cuerpo({
  consulta,
  alReintentar,
}: {
  consulta: {
    data: DetallePublicacionAdmin | undefined;
    isError: boolean;
    error: unknown;
  };
  alReintentar: () => void;
}) {
  if (consulta.isError) {
    return <EstadoError alReintentar={alReintentar} error={consulta.error} />;
  }

  const publicacion = consulta.data;
  if (!publicacion) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MiniaturaDePlato
        className="h-56 w-full rounded-md"
        imagenUrl={publicacion.imagenUrl}
        nombre={publicacion.nombre}
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h2 font-bold break-words text-text-primary">
          {publicacion.nombre}
        </h3>
        <InsigniaEstadoPublicacion estado={publicacion.estadoPublicacion} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body">
        <Dato
          etiqueta={TEXTOS.columnaCocinero}
          valor={nombreCompleto(
            publicacion.cocinero.nombre,
            publicacion.cocinero.apellido,
          )}
        />
        <Dato
          etiqueta={TEXTOS.columnaCategoria}
          valor={publicacion.categoria.nombre}
        />
        <Dato
          etiqueta={TEXTOS.columnaPrecio}
          valor={formatearPrecio(publicacion.precio)}
        />
        <Dato
          etiqueta={TEXTOS.columnaCreacion}
          valor={formatearFecha(publicacion.fechaCreacion)}
        />
      </dl>

      <div>
        <p className="text-label font-semibold text-text-secondary">
          {TEXTOS.descripcion}
        </p>
        <p className="mt-1 text-body whitespace-pre-line break-words text-text-primary">
          {publicacion.descripcion?.trim()
            ? publicacion.descripcion
            : TEXTOS.sinDescripcion}
        </p>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-label font-semibold text-text-secondary">
        {etiqueta}
      </dt>
      <dd className="text-text-primary">{valor}</dd>
    </div>
  );
}
