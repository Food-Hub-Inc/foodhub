import { Button, Table } from '@heroui/react';
import type { CategoriaListado } from '@foodhub/shared';
import { InsigniaHabilitacion } from '../../../components/InsigniasDelDominio.js';
import {
  IconoEditar,
  IconoEliminar,
  IconoExito,
  IconoOcultar,
} from '../../../components/iconos/index.js';
import { formatearNumero } from '../../../lib/formato.js';
import { TEXTOS_CATEGORIAS } from '../../../lib/textos.js';

/**
 * Tabla de PAN-ADM-04 (categorías) — US-CFG-01.
 *
 * Las columnas son las que fija el criterio de aceptación: nombre,
 * descripción (resumida), cantidad de publicaciones activas asociadas,
 * estado de habilitación y acciones.
 */
export interface AccionesDeFila {
  editar: (categoria: CategoriaListado) => void;
  habilitar: (categoria: CategoriaListado) => void;
  deshabilitar: (categoria: CategoriaListado) => void;
  eliminar: (categoria: CategoriaListado) => void;
}

export function TablaDeCategorias({
  categorias,
  acciones,
}: {
  categorias: readonly CategoriaListado[];
  acciones: AccionesDeFila;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS_CATEGORIAS.titulo}
          className="min-w-[860px]"
        >
          <Table.Header>
            <Table.Column isRowHeader>
              {TEXTOS_CATEGORIAS.columnaNombre}
            </Table.Column>
            <Table.Column>{TEXTOS_CATEGORIAS.columnaDescripcion}</Table.Column>
            <Table.Column>
              {TEXTOS_CATEGORIAS.columnaPublicaciones}
            </Table.Column>
            <Table.Column>{TEXTOS_CATEGORIAS.columnaEstado}</Table.Column>
            <Table.Column>{TEXTOS_CATEGORIAS.columnaAcciones}</Table.Column>
          </Table.Header>

          <Table.Body>
            {categorias.map((categoria) => (
              <Table.Row className="aparece-fila" key={categoria.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    {categoria.imagenPredeterminadaUrl ? (
                      <img
                        alt=""
                        className="size-9 shrink-0 rounded-sm border border-border object-cover"
                        src={categoria.imagenPredeterminadaUrl}
                      />
                    ) : null}
                    <span className="font-semibold text-text-primary">
                      {categoria.nombre}
                    </span>
                  </div>
                </Table.Cell>

                <Table.Cell>
                  <span className="line-clamp-1 max-w-xs text-text-secondary">
                    {categoria.descripcion ?? '—'}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <span className="text-text-secondary">
                    {formatearNumero(categoria.publicacionesActivas)}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <InsigniaHabilitacion activo={categoria.activo} />
                </Table.Cell>

                <Table.Cell>
                  <AccionesDeCategoria
                    acciones={acciones}
                    categoria={categoria}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function AccionesDeCategoria({
  categoria,
  acciones,
}: {
  categoria: CategoriaListado;
  acciones: AccionesDeFila;
}) {
  return (
    <div className="flex items-center gap-1">
      <BotonDeAccion
        alPresionar={() => {
          acciones.editar(categoria);
        }}
        etiqueta={`${TEXTOS_CATEGORIAS.accionEditar}: ${categoria.nombre}`}
      >
        <IconoEditar className="size-4.5" />
      </BotonDeAccion>

      {categoria.activo ? (
        <BotonDeAccion
          alPresionar={() => {
            acciones.deshabilitar(categoria);
          }}
          etiqueta={`${TEXTOS_CATEGORIAS.accionDeshabilitar}: ${categoria.nombre}`}
        >
          <IconoOcultar className="size-4.5" />
        </BotonDeAccion>
      ) : (
        <BotonDeAccion
          alPresionar={() => {
            acciones.habilitar(categoria);
          }}
          etiqueta={`${TEXTOS_CATEGORIAS.accionHabilitar}: ${categoria.nombre}`}
        >
          <IconoExito className="size-4.5" />
        </BotonDeAccion>
      )}

      <BotonDeAccion
        alPresionar={() => {
          acciones.eliminar(categoria);
        }}
        destructiva
        etiqueta={`${TEXTOS_CATEGORIAS.accionEliminar}: ${categoria.nombre}`}
      >
        <IconoEliminar className="size-4.5" />
      </BotonDeAccion>
    </div>
  );
}

function BotonDeAccion({
  children,
  etiqueta,
  alPresionar,
  destructiva = false,
}: {
  children: React.ReactNode;
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
