import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editarMiPerfil } from '../api/perfil';
import { mensajeDeError } from '../lib/api';
import { subirFotoDePerfil } from '../lib/subirFotoDePerfil';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';
import { CLAVE_PERFIL } from './usePerfil';
import { useSelectorDeFoto } from './useSelectorDeFoto';

/**
 * US-GURP-02 · PAN-GURP-01 — Cambio de la foto de perfil.
 *
 * Encadena las tres operaciones que el usuario percibe como una sola: elegir la
 * imagen, subirla a Supabase Storage contra una URL firmada y guardar la URL
 * resultante en el perfil. Es el mismo flujo que corre el registro; la única
 * diferencia es que acá ya hay sesión y no hace falta pasar un token explícito.
 *
 * DOS ERRORES DISTINTOS, DOS ORÍGENES DISTINTOS, UN SOLO MENSAJE EN PANTALLA:
 *
 *   `selector.error`  la imagen no cumple formato o tamaño. Lo detecta el
 *                     dispositivo antes de gastar la subida, y es el cuarto
 *                     criterio de aceptación de US-GURP-02.
 *   `errorDeSubida`   la imagen era válida pero la red o Storage fallaron.
 *
 * El perfil NO se actualiza de forma optimista. La foto es lo primero que el
 * usuario mira al volver a la pantalla: mostrarla puesta y que después se
 * revierta sola es peor que esperar el segundo que tarda la confirmación.
 */
export function useCambiarFotoDePerfil() {
  const cliente = useQueryClient();
  const [errorDeSubida, setErrorDeSubida] = useState<string | undefined>(
    undefined,
  );

  const guardar = useMutation({
    mutationFn: async (foto: FotoElegida) => {
      const fotoPerfilUrl = await subirFotoDePerfil(foto);
      return editarMiPerfil({ fotoPerfilUrl });
    },
    onSuccess: (perfil) => {
      // La API devuelve el perfil ya actualizado: escribirlo en la caché evita
      // un GET redundante y deja la pantalla consistente en el mismo tick.
      cliente.setQueryData(CLAVE_PERFIL, perfil);
    },
    onError: (fallo: unknown) => {
      setErrorDeSubida(mensajeDeError(fallo));
    },
  });

  const selector = useSelectorDeFoto((foto) => {
    if (foto === null) return;
    setErrorDeSubida(undefined);
    guardar.mutate(foto);
  });

  return {
    abrir: selector.abrir,
    cerrar: selector.cerrar,
    abierta: selector.abierta,
    elegirDeGaleria: selector.elegirDeGaleria,
    tomarFoto: selector.tomarFoto,
    subiendo: guardar.isPending,
    error: selector.error ?? errorDeSubida,
  };
}
