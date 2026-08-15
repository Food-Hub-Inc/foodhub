import { MENSAJES_USUARIO } from '@foodhub/shared';
import { eliminarUsuario, rehabilitarUsuario } from '../../api/usuarios.js';
import {
  errorGeneralDe,
  useOperacionDeUsuario,
} from '../../hooks/useOperacionDeUsuario.js';
import { TEXTOS_USUARIOS } from '../../lib/textos.js';
import { DialogoDeAlta } from './dialogos/DialogoDeAlta.js';
import { DialogoDeConfirmacion } from './dialogos/DialogoDeConfirmacion.js';
import { DialogoDeEdicion } from './dialogos/DialogoDeEdicion.js';
import { DialogoDeSuspension } from './dialogos/DialogoDeSuspension.js';
import type { DialogosAbiertos } from './dialogos/estado.js';

/**
 * Los cinco diálogos de la pantalla de usuarios.
 *
 * TODOS SE MONTAN Y DESMONTAN, no se ocultan.
 *
 * Cada uno inicializa su formulario desde la fila que recibe, sin efectos que
 * copien props a estado. Montarlos con `key={usuario.id}` es lo que garantiza
 * que abrir el diálogo sobre otra persona muestre los datos de esa persona: es
 * el patrón que React recomienda para reiniciar estado cuando cambia una prop.
 *
 * Las dos operaciones sin formulario —rehabilitar y dar de baja— viven acá y no
 * dentro de su diálogo, porque `DialogoDeConfirmacion` es genérico y no debe
 * saber a qué endpoint le está hablando.
 */
export function DialogosDeUsuarios({
  dialogos,
  alCerrar,
}: {
  dialogos: DialogosAbiertos;
  alCerrar: () => void;
}) {
  const rehabilitacion = useOperacionDeUsuario({
    ejecutar: (id: string) => rehabilitarUsuario(id),
    mensajeExito: MENSAJES_USUARIO.usuarioRehabilitado,
    alTerminar: alCerrar,
  });

  const baja = useOperacionDeUsuario({
    ejecutar: (id: string) => eliminarUsuario(id),
    mensajeExito: MENSAJES_USUARIO.usuarioEliminado,
    alTerminar: alCerrar,
  });

  const { alta, edicion, suspension, rehabilitacion: aRehabilitar } = dialogos;

  return (
    <>
      {alta ? <DialogoDeAlta alCerrar={alCerrar} /> : null}

      {edicion ? (
        <DialogoDeEdicion
          alCerrar={alCerrar}
          key={edicion.id}
          usuario={edicion}
        />
      ) : null}

      {suspension ? (
        <DialogoDeSuspension
          alCerrar={alCerrar}
          key={suspension.id}
          usuario={suspension}
        />
      ) : null}

      {aRehabilitar ? (
        <DialogoDeConfirmacion
          advertencia={TEXTOS_USUARIOS.confirmarRehabilitacion}
          alCerrar={alCerrar}
          alConfirmar={() => {
            rehabilitacion.mutate(aRehabilitar.id);
          }}
          enProceso={rehabilitacion.isPending}
          error={errorGeneralDe(rehabilitacion.error)}
          etiquetaConfirmar={TEXTOS_USUARIOS.accionRehabilitar}
          key={aRehabilitar.id}
          titulo={TEXTOS_USUARIOS.dialogoRehabilitacionTitulo}
          usuario={aRehabilitar}
        />
      ) : null}

      {dialogos.baja ? (
        <DialogoDeConfirmacion
          advertencia={MENSAJES_USUARIO.advertenciaEliminarUsuario}
          alCerrar={alCerrar}
          alConfirmar={() => {
            if (dialogos.baja) baja.mutate(dialogos.baja.id);
          }}
          destructivo
          enProceso={baja.isPending}
          error={errorGeneralDe(baja.error)}
          etiquetaConfirmar={TEXTOS_USUARIOS.accionEliminar}
          key={dialogos.baja.id}
          titulo={TEXTOS_USUARIOS.dialogoBajaTitulo}
          usuario={dialogos.baja}
        />
      ) : null}
    </>
  );
}
