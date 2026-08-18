import { useCallback, useEffect, useState } from 'react';
import type { Ubicacion } from '@foodhub/shared';
import { consultarGps } from '../lib/gps';

/**
 * Ubicación del dispositivo para el módulo de Exploración y búsqueda.
 *
 * NO PERSISTE NADA. El cliente no declara ubicación al registrarse, así que la
 * app la pide al GPS y la manda como query params en cada consulta. Ese es el
 * único uso: no hay un PATCH a `/usuarios/yo` detrás de este hook.
 *
 * La ubicación es OPCIONAL en todo el módulo, y de ahí sale la forma del
 * retorno: `coordenadas` es `null` mientras se pide y también si el permiso fue
 * denegado, y las pantallas siguen funcionando igual. El feed cae a orden por
 * fecha y sin distancia (US-EXP-01); solo el mapa exige el permiso y muestra el
 * mensaje "Activá la ubicación para ver cocineros cerca tuyo" (US-EXP-02), y
 * para eso mira `estado`, no `coordenadas`.
 *
 * Se consulta UNA VEZ por montaje. No hay seguimiento continuo de la posición:
 * ningún criterio de aceptación pide que el feed se reordene mientras el usuario
 * camina, y una suscripción a `watchPositionAsync` refetchearía el feed entero
 * cada pocos metros.
 */

export type EstadoUbicacion = 'pidiendo' | 'denegado' | 'sinPosicion' | 'listo';

export interface UbicacionActual {
  estado: EstadoUbicacion;
  /** `null` salvo que `estado` sea 'listo'. */
  coordenadas: Ubicacion | null;
  /** Vuelve a pedir permiso y posición. Es lo único que la app puede ofrecer
   *  una vez que Android registró la negativa. */
  reintentar: () => void;
}

export function useUbicacionActual(): UbicacionActual {
  const [estado, setEstado] = useState<EstadoUbicacion>('pidiendo');
  const [coordenadas, setCoordenadas] = useState<Ubicacion | null>(null);

  const pedir = useCallback(async (): Promise<void> => {
    setEstado('pidiendo');
    const resultado = await consultarGps();

    if (resultado.estado !== 'listo') {
      setCoordenadas(null);
      setEstado(resultado.estado);
      return;
    }
    setCoordenadas(resultado.punto);
    setEstado('listo');
  }, []);

  useEffect(() => {
    // Si la pantalla se abandona mientras el GPS todavía busca posición, el
    // resultado llega a un componente desmontado. La bandera lo descarta.
    let vigente = true;

    void consultarGps().then((resultado) => {
      if (!vigente) return;
      if (resultado.estado !== 'listo') {
        setEstado(resultado.estado);
        return;
      }
      setCoordenadas(resultado.punto);
      setEstado('listo');
    });

    return () => {
      vigente = false;
    };
  }, []);

  const reintentar = useCallback(() => {
    void pedir();
  }, [pedir]);

  return { estado, coordenadas, reintentar };
}
