import { Button, Table } from '@heroui/react';
import type { EstadoCuenta, UsuarioListado } from '@foodhub/shared';
import { AvatarUsuario } from '../../components/AvatarUsuario.js';
import {
  InsigniaEstadoCuenta,
  InsigniaRol,
} from '../../components/InsigniasDelDominio.js';
import {
  IconoEditar,
  IconoEliminar,
  IconoExito,
  IconoModeracion,
} from '../../components/iconos/index.js';
import {
  formatearFecha,
  idAbreviado,
  nombreCompleto,
} from '../../lib/formato.js';
import { TEXTOS_USUARIOS } from '../../lib/textos.js';

/**
 * Tabla de PAN-ADM-01 — US-GURP-05.
 *
 * Las columnas son las que fija RF091: nombre, apellido, correo, rol, estado de
 * cuenta y fecha de registro, más el identificador y la columna de acciones.
 */

/** Acciones que la pantalla puede disparar sobre una fila. */
export interface AccionesDeFila {
  editar: (usuario: UsuarioListado) => void;
  suspender: (usuario: UsuarioListado) => void;
  rehabilitar: (usuario: UsuarioListado) => void;
  eliminar: (usuario: UsuarioListado) => void;
}

export function TablaDeUsuarios({
  usuarios,
  acciones,
}: {
  usuarios: readonly UsuarioListado[];
  acciones: AccionesDeFila;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TEXTOS_USUARIOS.titulo}
          className="min-w-[980px]"
        >
          <Table.Header>
            <Table.Column>{TEXTOS_USUARIOS.columnaId}</Table.Column>
            <Table.Column isRowHeader>
              {TEXTOS_USUARIOS.columnaUsuario}
            </Table.Column>
            <Table.Column>{TEXTOS_USUARIOS.columnaCorreo}</Table.Column>
            <Table.Column>{TEXTOS_USUARIOS.columnaRol}</Table.Column>
            <Table.Column>{TEXTOS_USUARIOS.columnaEstado}</Table.Column>
            <Table.Column>{TEXTOS_USUARIOS.columnaRegistro}</Table.Column>
            <Table.Column>{TEXTOS_USUARIOS.columnaAcciones}</Table.Column>
          </Table.Header>

          <Table.Body>
            {usuarios.map((usuario) => (
              <Table.Row className="aparece-fila" key={usuario.id}>
                <Table.Cell>
                  {/* El UUID completo queda disponible al pasar el mouse y al
                      copiar: mostrarlo entero ocuparía más ancho que el resto
                      de la fila junta. */}
                  <span
                    className="font-mono text-caption text-text-secondary"
                    title={usuario.id}
                  >
                    {idAbreviado(usuario.id)}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <AvatarUsuario
                      apellido={usuario.apellido}
                      fotoUrl={usuario.fotoPerfilUrl}
                      nombre={usuario.nombre}
                    />
                    <span className="font-semibold text-text-primary">
                      {nombreCompleto(usuario.nombre, usuario.apellido)}
                    </span>
                  </div>
                </Table.Cell>

                <Table.Cell>
                  <span className="text-text-secondary">{usuario.email}</span>
                </Table.Cell>

                <Table.Cell>
                  <InsigniaRol tipo={usuario.tipo} />
                </Table.Cell>

                <Table.Cell>
                  <InsigniaEstadoCuenta estado={usuario.estadoCuenta} />
                </Table.Cell>

                <Table.Cell>
                  <span className="text-text-secondary">
                    {formatearFecha(usuario.fechaRegistro)}
                  </span>
                </Table.Cell>

                <Table.Cell>
                  <AccionesDeUsuario acciones={acciones} usuario={usuario} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

/**
 * Acciones disponibles según el estado de la cuenta. Es criterio de aceptación
 * de US-GURP-08 y US-GURP-09:
 *
 *   ACTIVA      suspender y eliminar
 *   SUSPENDIDA  rehabilitar y eliminar
 *   ELIMINADA   ninguna — la baja es definitiva y no se revierte desde el panel
 *
 * "Editar" acompaña a las dos primeras porque US-GURP-07 necesita un punto de
 * entrada y la maquetación no define otro; sobre una cuenta dada de baja no
 * tiene sentido y por eso no aparece.
 */
function AccionesDeUsuario({
  usuario,
  acciones,
}: {
  usuario: UsuarioListado;
  acciones: AccionesDeFila;
}) {
  if (usuario.estadoCuenta === 'ELIMINADA') {
    return (
      <span className="text-caption text-text-disabled">
        {TEXTOS_USUARIOS.sinAcciones}
      </span>
    );
  }

  const nombre = nombreCompleto(usuario.nombre, usuario.apellido);

  return (
    <div className="flex items-center gap-1">
      <BotonDeAccion
        etiqueta={`${TEXTOS_USUARIOS.accionEditar}: ${nombre}`}
        alPresionar={() => {
          acciones.editar(usuario);
        }}
      >
        <IconoEditar className="size-4.5" />
      </BotonDeAccion>

      {esActiva(usuario.estadoCuenta) ? (
        <BotonDeAccion
          etiqueta={`${TEXTOS_USUARIOS.accionSuspender}: ${nombre}`}
          alPresionar={() => {
            acciones.suspender(usuario);
          }}
        >
          <IconoModeracion className="size-4.5" />
        </BotonDeAccion>
      ) : (
        <BotonDeAccion
          etiqueta={`${TEXTOS_USUARIOS.accionRehabilitar}: ${nombre}`}
          alPresionar={() => {
            acciones.rehabilitar(usuario);
          }}
        >
          <IconoExito className="size-4.5" />
        </BotonDeAccion>
      )}

      <BotonDeAccion
        destructiva
        etiqueta={`${TEXTOS_USUARIOS.accionEliminar}: ${nombre}`}
        alPresionar={() => {
          acciones.eliminar(usuario);
        }}
      >
        <IconoEliminar className="size-4.5" />
      </BotonDeAccion>
    </div>
  );
}

function esActiva(estado: EstadoCuenta): boolean {
  return estado === 'ACTIVA';
}

/**
 * Botón de ícono de la columna de acciones.
 *
 * El `aria-label` nombra la acción Y la persona: en una tabla de veinte filas,
 * "Suspender cuenta" repetido veinte veces no le dice a nadie cuál de todas es.
 */
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
