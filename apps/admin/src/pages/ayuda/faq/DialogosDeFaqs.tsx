import { MENSAJES_AYUDA } from '@foodhub/shared';
import { deshabilitarFaq } from '../../../api/ayuda.js';
import {
  errorGeneralDe,
  useOperacionDeAyuda,
} from '../../../hooks/useOperacionDeAyuda.js';
import { DialogoDeDeshabilitar } from '../dialogos/Controles.js';
import { DialogoDeFaq } from '../dialogos/DialogoDeFaq.js';
import type { DialogosDeFaqs } from '../dialogos/estado.js';

/** Diálogos de las FAQ (US-AYU-05). "Habilitar" se dispara desde la tabla. */
export function DialogosDeFaqs({
  dialogos,
  alCerrar,
}: {
  dialogos: DialogosDeFaqs;
  alCerrar: () => void;
}) {
  const deshabilitacion = useOperacionDeAyuda({
    ejecutar: (id: string) => deshabilitarFaq(id),
    mensajeExito: MENSAJES_AYUDA.admin.faqDeshabilitada,
    alTerminar: alCerrar,
  });

  return (
    <>
      {dialogos.alta ? <DialogoDeFaq alCerrar={alCerrar} /> : null}

      {dialogos.edicion ? (
        <DialogoDeFaq
          alCerrar={alCerrar}
          faq={dialogos.edicion}
          key={dialogos.edicion.id}
        />
      ) : null}

      {dialogos.deshabilitacion ? (
        <DialogoDeDeshabilitar
          alCerrar={alCerrar}
          alConfirmar={() => {
            if (dialogos.deshabilitacion) {
              deshabilitacion.mutate(dialogos.deshabilitacion.id);
            }
          }}
          enProceso={deshabilitacion.isPending}
          error={errorGeneralDe(deshabilitacion.error)}
          key={dialogos.deshabilitacion.id}
          nombre={dialogos.deshabilitacion.pregunta}
        />
      ) : null}
    </>
  );
}
