import { useState } from 'react';
import { MENSAJES_CONFIGURACION } from '@foodhub/shared';
import { useOperacionDeParametros } from '../../../hooks/useOperacionDeParametros.js';

/**
 * Estado y mutaciones que comparten las cuatro secciones de PAN-ADM-04
 * (US-CFG-03): qué diálogo está abierto ("guardar" | "restaurar" | ninguno)
 * y las dos operaciones de guardado, que en ambos casos sincronizan el
 * formulario con lo que confirmó el servidor y cierran el diálogo.
 */
export function useFormularioDeSeccion<TDatos, TResultado>({
  actualizar,
  restaurarValores,
  alExito,
}: {
  actualizar: (datos: TDatos) => Promise<TResultado>;
  restaurarValores: () => Promise<TResultado>;
  alExito: (resultado: TResultado) => void;
}) {
  const [dialogoAbierto, setDialogoAbierto] = useState<
    'guardar' | 'restaurar' | null
  >(null);

  function alTerminar(resultado: TResultado) {
    alExito(resultado);
    setDialogoAbierto(null);
  }

  const guardar = useOperacionDeParametros({
    ejecutar: actualizar,
    mensajeExito: MENSAJES_CONFIGURACION.parametrosActualizados,
    alTerminar,
  });

  const restaurar = useOperacionDeParametros({
    ejecutar: restaurarValores,
    mensajeExito: MENSAJES_CONFIGURACION.parametrosRestaurados,
    alTerminar,
  });

  return {
    dialogoAbierto,
    abrirGuardar: () => {
      setDialogoAbierto('guardar');
    },
    abrirRestaurar: () => {
      setDialogoAbierto('restaurar');
    },
    cerrarDialogo: () => {
      setDialogoAbierto(null);
    },
    guardar,
    restaurar,
  };
}
