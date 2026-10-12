import type { ReactNode } from 'react';
import { Button, Table } from '@heroui/react';
import type { PublicacionAdmin } from '@foodhub/shared';
import { InsigniaEstadoPublicacion } from '../../../components/InsigniasDelDominio.js';
import { IconoEliminar, IconoVer } from '../../../components/iconos/index.js';
import {
  formatearFecha,
  formatearPrecio,
  nombreCompleto,
} from '../../../lib/formato.js';
import { TEXTOS_MODERACION_PUBLICACIONES as TEXTOS } from '../../../lib/textos.js';
import { MiniaturaDePlato } from './MiniaturaDePlato.js';

/**
 * Tabla de la pestaña "Publicaciones" — primer criterio de US-ADM-04:
 * "imagen, nombre del plato, cocinero propietario, categoría, precio, estado y
 * fecha de creación". Imagen y nombre comparten celda, como en PAN-ADM-01 el
 * avatar y el nombre.
 */
export function TablaDePublicaciones({
  publicaciones,
  alVerDetalle,
  alEliminar,
}: {
  publicaciones: readonly PublicacionAdmin[];
  alVerDetalle: (id: string) => void;
  alEliminar: (publicacion: PublicacionAdmin) => void;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS.pestanaPublicaciones}
          className="min-w-[980px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>{TEXTOS.columnaPlato}</Table.Column>
            <Table.Column>{TEXTOS.columnaCocinero}</Table.Column>
            <Table.Column>{TEXTOS.columnaCategoria}</Table.Column>
            <Table.Column>{TEXTOS.columnaPrecio}</Table.Column>
            <Table.Column>{TEXTOS.columnaEstado}</Table.Column>
            <Table.Column>{TEXTOS.columnaCreacion}</Table.Column>
            <Table.Column>{TEXTOS.columnaAcciones}</Table.Column>
          </Table.Header>

          <Table.Body>
            {publicaciones.map((publicacion) => (
              <FilaDePublicacion
                alEliminar={alEliminar}
                alVerDetalle={alVerDetalle}
                key={publicacion.id}
                publicacion={publicacion}
              />
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

/** Una fila: los siete datos del primer criterio y las dos acciones. */
function FilaDePublicacion({
  publicacion,
  alVerDetalle,
  alEliminar,
}: {
  publicacion: PublicacionAdmin;
  alVerDetalle: (id: string) => void;
  alEliminar: (publicacion: PublicacionAdmin) => void;
}) {
  return (
    <Table.Row className="aparece-fila">
      <Table.Cell>
        <div className="flex items-center gap-3">
          <MiniaturaDePlato
            imagenUrl={publicacion.imagenUrl}
            nombre={publicacion.nombre}
          />
          <span
            className="line-clamp-2 max-w-[260px] font-semibold text-text-primary"
            title={publicacion.nombre}
          >
            {publicacion.nombre}
          </span>
        </div>
      </Table.Cell>

      <Table.Cell>
        <span className="text-text-secondary">
          {nombreCompleto(
            publicacion.cocinero.nombre,
            publicacion.cocinero.apellido,
          )}
        </span>
      </Table.Cell>

      <Table.Cell>
        <span className="text-text-secondary">
          {publicacion.categoria.nombre}
        </span>
      </Table.Cell>

      <Table.Cell>
        <span className="font-semibold text-text-primary tabular-nums">
          {formatearPrecio(publicacion.precio)}
        </span>
      </Table.Cell>

      <Table.Cell>
        <InsigniaEstadoPublicacion estado={publicacion.estadoPublicacion} />
      </Table.Cell>

      <Table.Cell>
        <span className="text-text-secondary">
          {formatearFecha(publicacion.fechaCreacion)}
        </span>
      </Table.Cell>

      <Table.Cell>
        <div className="flex items-center gap-1">
          <BotonDeAccion
            alPresionar={() => {
              alVerDetalle(publicacion.id);
            }}
            etiqueta={TEXTOS.verDetalleDe(publicacion.nombre)}
          >
            <IconoVer className="size-4.5" />
          </BotonDeAccion>
          <BotonDeAccion
            alPresionar={() => {
              alEliminar(publicacion);
            }}
            destructiva
            etiqueta={TEXTOS.eliminarDe(publicacion.nombre)}
          >
            <IconoEliminar className="size-4.5" />
          </BotonDeAccion>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

/**
 * Botón de ícono de la columna de acciones, igual al de PAN-ADM-01: el
 * `aria-label` nombra la acción Y el plato.
 */
function BotonDeAccion({
  children,
  etiqueta,
  alPresionar,
  destructiva = false,
}: {
  children: ReactNode;
  etiqueta: string;
  alPresionar: () => void;
  destructiva?: boolean;
}) {
  return (
    <Button
      aria-label={etiqueta}
      className={
        destructiva
          ? 'size-9 text-text-secondary transition-colors duration-150 hover:text-error'
          : 'size-9 text-text-secondary transition-colors duration-150 hover:text-primary'
      }
      isIconOnly
      onPress={alPresionar}
      size="sm"
      variant="ghost"
    >
      {children}
    </Button>
  );
}
