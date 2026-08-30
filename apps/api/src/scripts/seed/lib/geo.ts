/**
 * Distancia entre dos puntos del Gran Mendoza.
 *
 * Se usa para que los clientes le pidan mas seguido al cocinero que tienen
 * cerca. Sin ese sesgo, un cliente de Lujan de Cuyo le pediria a uno de Las
 * Heras con la misma frecuencia que al de su cuadra, y el dataset dejaria de
 * parecerse a lo que produce una plataforma de proximidad.
 *
 * Formula del semiverseno sobre una esfera de radio medio. Sobra para
 * distancias de decenas de kilometros; la seed no necesita la precision de
 * PostGIS y traerla implicaria una consulta a la base por cada pedido.
 */

const RADIO_TIERRA_KM = 6371;

export interface Punto {
  /** Longitud. */
  x: number;
  /** Latitud. */
  y: number;
}

const enRadianes = (grados: number): number => (grados * Math.PI) / 180;

export function distanciaKm(a: Punto, b: Punto): number {
  const deltaLat = enRadianes(b.y - a.y);
  const deltaLon = enRadianes(b.x - a.x);
  const arco =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(enRadianes(a.y)) *
      Math.cos(enRadianes(b.y)) *
      Math.sin(deltaLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(arco)));
}
