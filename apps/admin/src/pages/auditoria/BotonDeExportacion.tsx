import { useState } from 'react';
import { Button, Spinner, toast } from '@heroui/react';
import { IconoDescargar } from '../../components/iconos/index.js';
import { mensajeDeError } from '../../lib/api.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';

/**
 * Exportación a CSV de la solapa activa — US-AUD-01 y US-AUD-02.
 *
 * Se hace cargo del estado de la descarga y de avisar si falla. Una
 * exportación que se rompe en silencio deja al administrador esperando un
 * archivo que nunca va a llegar, y por eso el error se anuncia aunque no
 * bloquee nada.
 *
 * Qué se exporta lo decide quien lo monta: este botón solo dispara la promesa
 * que recibe.
 */
export function BotonDeExportacion({
  exportar,
  deshabilitado,
}: {
  exportar: () => Promise<void>;
  deshabilitado: boolean;
}) {
  const [exportando, setExportando] = useState(false);

  async function descargar() {
    setExportando(true);
    try {
      await exportar();
    } catch (error) {
      toast.danger(mensajeDeError(error));
    } finally {
      setExportando(false);
    }
  }

  return (
    <Button
      isDisabled={exportando || deshabilitado}
      onPress={() => void descargar()}
      variant="secondary"
    >
      {exportando ? (
        <Spinner className="size-4" />
      ) : (
        <IconoDescargar className="size-4" />
      )}
      {TEXTOS_AUDITORIA.exportar}
    </Button>
  );
}
