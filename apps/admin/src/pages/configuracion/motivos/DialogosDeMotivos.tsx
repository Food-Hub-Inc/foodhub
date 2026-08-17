import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { deshabilitarMotivoCancelacion } from '../../../api/motivosCancelacion.js';
import {
  errorGeneralDe,
  useOperacionDeMotivo,
} from '../../../hooks/useOperacionDeMotivo.js';
import { TEXTOS_MOTIVOS } from '../../../lib/textos.js';
import { DialogoDeAlta } from './dialogos/DialogoDeAlta.js';
import { DialogoDeConfirmacion } from './dialogos/DialogoDeConfirmacion.js';
import { DialogoDeEdicion } from './dialogos/DialogoDeEdicion.js';
import type { DialogosAbiertos } from './dialogos/estado.js';

/**
 * Los tres diálogos de PAN-ADM-04 (motivos de cancelación). "Habilitar" no
 * tiene diálogo, igual que en categorías: se dispara directo desde
 * `PanelDeMotivos.tsx`.
 */
export function DialogosDeMotivos({
  dialogos,
  alCerrar,
}: {
  dialogos: DialogosAbiertos;
  alCerrar: () => void;
}) {
  const deshabilitacion = useOperacionDeMotivo({
    ejecutar: (id: string) => deshabilitarMotivoCancelacion(id),
    mensajeExito: MENSAJES_CONFIGURACION.motivoDeshabilitado,
    alTerminar: alCerrar,
  });

  return (
    <>
      {dialogos.alta ? <DialogoDeAlta alCerrar={alCerrar} /> : null}

      {dialogos.edicion ? (
        <DialogoDeEdicion
          alCerrar={alCerrar}
          key={dialogos.edicion.id}
          motivo={dialogos.edicion}
        />
      ) : null}

      {dialogos.deshabilitacion ? (
        <DialogoDeConfirmacion
          advertencia={MENSAJES_CONFIGURACION.confirmarDeshabilitarMotivo}
          alCerrar={alCerrar}
          alConfirmar={() => {
            if (dialogos.deshabilitacion) {
              deshabilitacion.mutate(dialogos.deshabilitacion.id);
            }
          }}
          enProceso={deshabilitacion.isPending}
          error={errorGeneralDe(deshabilitacion.error)}
          etiquetaConfirmar={TEXTOS_MOTIVOS.accionDeshabilitar}
          key={dialogos.deshabilitacion.id}
          motivo={dialogos.deshabilitacion}
          titulo={TEXTOS_MOTIVOS.dialogoDeshabilitacionTitulo}
        />
      ) : null}
    </>
  );
}
