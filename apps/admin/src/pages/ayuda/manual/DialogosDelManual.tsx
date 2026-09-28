import { MENSAJES_AYUDA, type CapituloAyudaListado } from '@foodhub/shared';
import { deshabilitarCapitulo } from '../../../api/ayuda.js';
import {
  errorGeneralDe,
  useOperacionDeAyuda,
} from '../../../hooks/useOperacionDeAyuda.js';
import { DialogoDeDeshabilitar } from '../dialogos/Controles.js';

/**
 * Diálogo de baja lógica del manual (US-AYU-05). El alta y la edición viven en
 * `PaginaDeCapitulo`; "habilitar" se dispara directo desde la tabla.
 */
export function DialogosDelManual({
  capitulo,
  alCerrar,
}: {
  capitulo: CapituloAyudaListado | null;
  alCerrar: () => void;
}) {
  const deshabilitacion = useOperacionDeAyuda({
    ejecutar: (id: string) => deshabilitarCapitulo(id),
    mensajeExito: MENSAJES_AYUDA.admin.capituloDeshabilitado,
    alTerminar: alCerrar,
  });

  if (!capitulo) return null;

  return (
    <DialogoDeDeshabilitar
      alCerrar={alCerrar}
      alConfirmar={() => {
        deshabilitacion.mutate(capitulo.id);
      }}
      enProceso={deshabilitacion.isPending}
      error={errorGeneralDe(deshabilitacion.error)}
      key={capitulo.id}
      nombre={capitulo.titulo}
    />
  );
}
