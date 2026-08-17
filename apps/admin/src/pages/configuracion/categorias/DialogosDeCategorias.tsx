import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import {
  deshabilitarCategoria,
  eliminarCategoria,
} from '../../../api/categorias.js';
import {
  errorGeneralDe,
  useOperacionDeCategoria,
} from '../../../hooks/useOperacionDeCategoria.js';
import { TEXTOS_CATEGORIAS } from '../../../lib/textos.js';
import { DialogoDeAlta } from './dialogos/DialogoDeAlta.js';
import { DialogoDeConfirmacion } from './dialogos/DialogoDeConfirmacion.js';
import { DialogoDeEdicion } from './dialogos/DialogoDeEdicion.js';
import type { DialogosAbiertos } from './dialogos/estado.js';

/**
 * Los cuatro diálogos con formulario o confirmación de PAN-ADM-04 (categorías).
 * "Habilitar" no tiene diálogo: el criterio de aceptación de US-CFG-01 pide
 * que se aplique de inmediato, y esa mutación vive en `PanelDeCategorias.tsx`,
 * disparada directo desde la acción de la tabla.
 *
 * Mismo patrón que `DialogosDeUsuarios.tsx`: todos se montan y desmontan, con
 * `key={categoria.id}` para que el formulario arranque con los datos de la
 * fila correcta sin un efecto que copie props a estado.
 */
export function DialogosDeCategorias({
  dialogos,
  alCerrar,
}: {
  dialogos: DialogosAbiertos;
  alCerrar: () => void;
}) {
  const deshabilitacion = useOperacionDeCategoria({
    ejecutar: (id: string) => deshabilitarCategoria(id),
    mensajeExito: MENSAJES_CONFIGURACION.categoriaDeshabilitada,
    alTerminar: alCerrar,
  });

  const eliminacion = useOperacionDeCategoria({
    ejecutar: (id: string) => eliminarCategoria(id),
    mensajeExito: MENSAJES_CONFIGURACION.categoriaEliminada,
    alTerminar: alCerrar,
  });

  return (
    <>
      {dialogos.alta ? <DialogoDeAlta alCerrar={alCerrar} /> : null}

      {dialogos.edicion ? (
        <DialogoDeEdicion
          alCerrar={alCerrar}
          categoria={dialogos.edicion}
          key={dialogos.edicion.id}
        />
      ) : null}

      {dialogos.deshabilitacion ? (
        <DialogoDeConfirmacion
          advertencia={MENSAJES_CONFIGURACION.advertenciaDeshabilitarCategoria}
          alCerrar={alCerrar}
          alConfirmar={() => {
            if (dialogos.deshabilitacion) {
              deshabilitacion.mutate(dialogos.deshabilitacion.id);
            }
          }}
          categoria={dialogos.deshabilitacion}
          destructivo
          enProceso={deshabilitacion.isPending}
          error={errorGeneralDe(deshabilitacion.error)}
          etiquetaConfirmar={TEXTOS_CATEGORIAS.accionDeshabilitar}
          key={dialogos.deshabilitacion.id}
          titulo={MENSAJES_CONFIGURACION.confirmarDeshabilitarCategoria(
            dialogos.deshabilitacion.nombre,
          )}
        />
      ) : null}

      {dialogos.eliminacion ? (
        <DialogoDeConfirmacion
          advertencia={TEXTOS_CATEGORIAS.confirmarEliminar}
          alCerrar={alCerrar}
          alConfirmar={() => {
            if (dialogos.eliminacion)
              eliminacion.mutate(dialogos.eliminacion.id);
          }}
          categoria={dialogos.eliminacion}
          destructivo
          enProceso={eliminacion.isPending}
          error={errorGeneralDe(eliminacion.error)}
          etiquetaConfirmar={TEXTOS_CATEGORIAS.accionEliminar}
          key={dialogos.eliminacion.id}
          titulo={TEXTOS_CATEGORIAS.dialogoEliminacionTitulo}
        />
      ) : null}
    </>
  );
}
