import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Skeleton } from '@heroui/react';
import type { TipoVersionTerminos } from '@foodhub/shared';
import {
  listarHistorialTerminos,
  obtenerVersionCompleta,
} from '../../../api/terminos.js';
import { Dialogo } from '../../../components/Dialogo.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { formatearFecha, nombreCompleto } from '../../../lib/formato.js';
import { TEXTOS_TERMINOS } from '../../../lib/textos.js';

/**
 * "Ver historial" (US-CFG-04): listado de versiones publicadas, con "Ver
 * contenido" por fila. Un único diálogo que alterna entre la lista y el
 * contenido de la versión elegida, en lugar de apilar dos modales.
 */
export function DialogoHistorial({
  tipo,
  alCerrar,
}: {
  tipo: TipoVersionTerminos;
  alCerrar: () => void;
}) {
  const [versionId, setVersionId] = useState<string | null>(null);

  return versionId ? (
    <VistaDeContenido
      alCerrar={alCerrar}
      alVolver={() => {
        setVersionId(null);
      }}
      tipo={tipo}
      versionId={versionId}
    />
  ) : (
    <VistaDeLista
      alCerrar={alCerrar}
      alVerContenido={setVersionId}
      tipo={tipo}
    />
  );
}

function VistaDeLista({
  tipo,
  alVerContenido,
  alCerrar,
}: {
  tipo: TipoVersionTerminos;
  alVerContenido: (id: string) => void;
  alCerrar: () => void;
}) {
  const historial = useQuery({
    queryKey: ['terminos-historial', tipo],
    queryFn: () => listarHistorialTerminos(tipo),
  });

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      pie={<Button onPress={alCerrar}>Cerrar</Button>}
      tamano="md"
      titulo={TEXTOS_TERMINOS.historialTitulo}
    >
      {historial.isPending ? (
        <div aria-hidden="true" className="space-y-2">
          <Skeleton className="h-10 rounded-sm" />
          <Skeleton className="h-10 rounded-sm" />
          <Skeleton className="h-10 rounded-sm" />
        </div>
      ) : null}

      {historial.isError ? (
        <EstadoError
          alReintentar={() => {
            void historial.refetch();
          }}
          error={historial.error}
        />
      ) : null}

      {historial.data ? (
        <ul className="divide-y divide-border">
          {historial.data.map((version) => (
            <li
              className="flex items-center justify-between gap-3 py-2.5"
              key={version.id}
            >
              <div>
                <p className="font-semibold text-text-primary">
                  Versión {version.numeroVersion}
                </p>
                <p className="text-caption text-text-secondary">
                  {formatearFecha(version.fechaPublicacion)} ·{' '}
                  {version.adminAutor
                    ? nombreCompleto(
                        version.adminAutor.nombre,
                        version.adminAutor.apellido,
                      )
                    : TEXTOS_TERMINOS.autorDesconocido}
                </p>
              </div>
              <Button
                onPress={() => {
                  alVerContenido(version.id);
                }}
                size="sm"
                variant="secondary"
              >
                {TEXTOS_TERMINOS.verContenido}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Dialogo>
  );
}

function VistaDeContenido({
  tipo,
  versionId,
  alVolver,
  alCerrar,
}: {
  tipo: TipoVersionTerminos;
  versionId: string;
  alVolver: () => void;
  alCerrar: () => void;
}) {
  const version = useQuery({
    queryKey: ['terminos-version', tipo, versionId],
    queryFn: () => obtenerVersionCompleta(tipo, versionId),
  });

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      pie={<Button onPress={alVolver}>Volver</Button>}
      tamano="md"
      titulo={TEXTOS_TERMINOS.dialogoContenidoTitulo}
    >
      {version.isPending ? (
        <div aria-hidden="true" className="space-y-2">
          <Skeleton className="h-4 rounded-sm" />
          <Skeleton className="h-4 rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
        </div>
      ) : null}

      {version.isError ? (
        <EstadoError
          alReintentar={() => {
            void version.refetch();
          }}
          error={version.error}
        />
      ) : null}

      {version.data ? (
        <>
          <p className="mb-3 text-caption text-text-secondary">
            Versión {version.data.numeroVersion} ·{' '}
            {formatearFecha(version.data.fechaPublicacion)} ·{' '}
            {version.data.adminAutor
              ? nombreCompleto(
                  version.data.adminAutor.nombre,
                  version.data.adminAutor.apellido,
                )
              : TEXTOS_TERMINOS.autorDesconocido}
          </p>
          {/* El contenido ya pasó por sanitize-html en el servidor antes de guardarse: es seguro renderizarlo. */}
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: version.data.contenidoHtml }}
          />
        </>
      ) : null}
    </Dialogo>
  );
}
