import * as Location from 'expo-location';
import type { Ubicacion } from '@foodhub/shared';

/**
 * Acceso al GPS del dispositivo, en un solo lugar.
 *
 * Lo usan dos cosas muy distintas: el selector de ubicación del registro de
 * cocinero (`SelectorDeUbicacion`, US-AUT-02), donde la ubicación se PERSISTE, y
 * todo el módulo de Exploración (`useUbicacionActual`), donde solo acompaña a la
 * consulta y no se guarda. Lo único que comparten es esta función; el resto
 * -qué se hace con el punto y cómo se muestra el permiso denegado- es propio de
 * cada uno.
 *
 * No conoce React: devuelve un valor y no toca ningún estado. Eso es lo que
 * permite que sus dos consumidores manejen el resultado con la máquina de
 * estados que cada pantalla necesita.
 */

/** Lo que devuelve una consulta al GPS: o falló por un motivo, o hay punto. */
export type ResultadoGps =
  | { estado: 'denegado' | 'sinPosicion' }
  | { estado: 'listo'; punto: Ubicacion };

/**
 * Pide permiso y posición al sistema operativo.
 *
 * `Accuracy.Balanced` y no `High`: para ordenar un feed por cercanía y dibujar
 * cocineros en un mapa alcanza con precisión de decenas de metros, y pedir la
 * máxima enciende el GPS por satélite, que tarda más y consume batería.
 */
export async function consultarGps(): Promise<ResultadoGps> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) return { estado: 'denegado' };

  try {
    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      estado: 'listo',
      punto: {
        lat: posicion.coords.latitude,
        lng: posicion.coords.longitude,
      },
    };
  } catch {
    // El GPS apagado, el modo avión o un fix que no llega terminan acá.
    return { estado: 'sinPosicion' };
  }
}
