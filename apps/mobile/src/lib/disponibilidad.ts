import type { EstadoPublicacion } from '@foodhub/shared';
import { TEXTOS_PUBLICACIONES } from './textos';

/**
 * Representación visual de la disponibilidad de un plato, en un solo lugar.
 *
 * Los colores salen de la guía visual (badges de `EstadoPublicacion`): éxito
 * para disponible, advertencia para últimas unidades y el gris de texto
 * deshabilitado -nunca el rojo de error, reservado a acciones destructivas- para
 * no disponible.
 *
 * Vive en `lib/` porque lo consumen los dos lados del producto: el cocinero, en
 * el selector interactivo de "Mis publicaciones" (US-PUB-04), y el cliente, en
 * la tarjeta del feed y en el detalle del plato, donde el segundo criterio de
 * US-EXP-01 exige "diferenciación visual entre 'Disponible' (verde) y 'Últimas
 * unidades' (amarillo)". Dos copias del mapa se desincronizan en cuanto la guía
 * cambie un token, y el desajuste queda invisible hasta que alguien compare las
 * dos pantallas.
 *
 * EL COLOR NUNCA ES EL ÚNICO CANAL: todo badge que use este mapa lleva además su
 * etiqueta en texto. Un usuario con dificultad para distinguir verde de amarillo
 * tiene que poder leer el estado.
 */
export const ESTILO_DISPONIBILIDAD: Record<
  EstadoPublicacion,
  { punto: string; texto: string }
> = {
  DISPONIBLE: { punto: 'bg-success', texto: 'text-success' },
  ULTIMAS_UNIDADES: { punto: 'bg-warning', texto: 'text-warning' },
  NO_DISPONIBLE: { punto: 'bg-text-disabled', texto: 'text-text-disabled' },
};

/**
 * Nombre visible de cada estado.
 *
 * Los tres textos se transcribieron de los criterios de US-PUB-04 y viven en
 * `TEXTOS_PUBLICACIONES`; se referencian desde acá en lugar de copiarlos porque
 * son las mismas tres palabras para los dos roles: no hay un "Disponible" del
 * cocinero y otro del cliente.
 */
export const ETIQUETA_DISPONIBILIDAD: Record<EstadoPublicacion, string> = {
  DISPONIBLE: TEXTOS_PUBLICACIONES.estadoDisponible,
  ULTIMAS_UNIDADES: TEXTOS_PUBLICACIONES.estadoUltimasUnidades,
  NO_DISPONIBLE: TEXTOS_PUBLICACIONES.estadoNoDisponible,
};
