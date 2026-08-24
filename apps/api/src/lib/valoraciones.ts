import { avg, count, eq, sql } from 'drizzle-orm';
import { resena } from '@foodhub/db';
import { db } from './db.js';

/**
 * Promedios de reputacion, en un solo lugar.
 *
 * Vive en `lib/` y no dentro de un modulo porque la consumen dos: Publicaciones
 * la usa para la columna "valoracion" de su listado propio (US-PUB-05) y
 * Exploracion para el filtro por valoracion minima (US-EXP-03), el detalle del
 * plato (US-EXP-05), el perfil publico (US-EXP-04), la tarjeta del mapa
 * (US-EXP-02) y las dos pestanas de favoritos (US-EXP-06). Una copia por modulo
 * se desincroniza en cuanto cambie la regla de que resenas cuentan.
 *
 * DOS REGLAS QUE VALEN PARA TODOS LOS PROMEDIOS DEL SISTEMA
 *
 *   Solo cuentan las resenas VISIBLE. La moderacion pasa una resena a
 *   OCULTA_MODERACION justamente para que deje de pesar en la reputacion, y las
 *   que el autor retira quedan en ELIMINADA_AUTOR. Los indices parciales
 *   `resena_publicacion_idx` y `resena_cocinero_idx` llevan esta misma
 *   condicion, asi que la cubren entera.
 *
 *   El promedio se devuelve como viene de la base: `numeric`, que Drizzle
 *   entrega como string, y `null` cuando no hay ninguna resena. NO se le aplica
 *   `.mapWith(Number)` a proposito: `Number(null)` es 0, y un plato sin resenas
 *   quedaria mostrando una valoracion de cero en vez de "sin calificaciones".
 *   La conversion la hace `aValoracion`, que si distingue los dos casos.
 */

/**
 * Convierte el promedio crudo al numero del contrato publico.
 *
 * Funcion PURA, sin acceso a `db`: es la que decide que `null` (sin resenas) y
 * 0 (todas de una estrella, imposible por el CHECK de rango, pero el tipo lo
 * permite) son cosas distintas, y esa decision se puede probar sola.
 */
export function aValoracion(promedio: string | null): number | null {
  return promedio === null ? null : Number(promedio);
}

/**
 * Promedio y cantidad de resenas VISIBLE por PUBLICACION.
 *
 * Agrupa DENTRO de la subconsulta, antes del LEFT JOIN del llamador: asi el
 * join nunca duplica una fila de publicacion, sin importar cuantas resenas
 * tenga.
 */
export function subconsultaValoracionPorPublicacion() {
  const tabla = db
    .select({
      publicacionId: resena.publicacionId,
      promedio: avg(resena.calificacion).as('valoracion_promedio'),
      cantidad: count().as('cantidad_resenas'),
    })
    .from(resena)
    .where(eq(resena.estadoResena, 'VISIBLE'))
    .groupBy(resena.publicacionId)
    .as('valoracion_por_publicacion');

  return { tabla, promedio: tabla.promedio, cantidad: tabla.cantidad };
}

/**
 * Minimo de resenas que necesita un cocinero para que su promedio sea PUBLICO
 * (US-RES-03), leido de `configuracion_sistema` en la misma consulta.
 *
 * POR QUE UN SUBSELECT Y NO UN PARAMETRO DE LA FUNCION
 *
 * `subconsultaValoracionPorCocinero` la llaman seis servicios distintos (feed,
 * mapa, perfil publico, favoritos, carrito y pedidos). Pasarles el umbral
 * obligaria a que los seis lo consulten antes y lo propaguen, con seis
 * oportunidades de olvidarselo en el proximo modulo que muestre una valoracion.
 * Resuelto adentro, el umbral se respeta siempre y ademas toma el valor vigente
 * sin cache: el administrador lo cambia desde PAN-ADM-04 y rige en la consulta
 * siguiente.
 *
 * El `regexp_replace` es la defensa contra un valor no numerico: `valor` es una
 * columna de texto y un cast directo abortaria toda la consulta. Ante cualquier
 * cosa rara cae al 3 de fabrica, mismo criterio que la funcion
 * `expirar_pedidos_sin_respuesta` de la migracion 0010.
 */
const minimoResenasParaPromedio = sql`coalesce((
  select nullif(regexp_replace(valor, '[^0-9]', '', 'g'), '')::int
    from configuracion_sistema
   where clave = 'resena_minimo_para_promedio'
), 3)`;

/**
 * Promedio y cantidad de resenas VISIBLE por COCINERO.
 *
 * Se apoya en `resena.cocineroResId`, la columna desnormalizada del schema:
 * evita pasar por `publicacion` para un dato que no cambia (una publicacion no
 * se transfiere de cocinero) y deja la agregacion cubierta por
 * `resena_cocinero_idx`.
 *
 * EL PROMEDIO ES `null` HASTA ALCANZAR EL MINIMO (US-RES-03). Con dos o tres
 * opiniones un promedio no describe a nadie: una sola resena mala dejaria a un
 * cocinero en 1,0 de por vida. `cantidad` NO se recorta -sigue informando el
 * total real- para que la interfaz pueda distinguir "todavia no tiene resenas"
 * de "tiene pocas y por eso no mostramos promedio".
 *
 * Devolver `null` es ademas lo que hace que este cambio no rompa a ningun
 * consumidor: los seis ya pasan el valor por `aValoracion`, que trata `null`
 * como "Sin calificaciones aun".
 */
export function subconsultaValoracionPorCocinero() {
  const tabla = db
    .select({
      cocineroId: resena.cocineroResId,
      promedio: sql<string | null>`case
        when count(*) >= ${minimoResenasParaPromedio}
        then ${avg(resena.calificacion)}
      end`.as('valoracion_promedio'),
      cantidad: count().as('cantidad_resenas'),
    })
    .from(resena)
    .where(eq(resena.estadoResena, 'VISIBLE'))
    .groupBy(resena.cocineroResId)
    .as('valoracion_por_cocinero');

  return { tabla, promedio: tabla.promedio, cantidad: tabla.cantidad };
}
