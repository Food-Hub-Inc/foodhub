import { favoritoCocinero, favoritoPublicacion } from '@foodhub/db';
import { db } from '../../../lib/db.js';
import type { ContextoSeed, UsuarioCreado } from '../lib/contexto.js';
import { distanciaKm } from '../lib/geo.js';
import { FIN_VENTANA, INICIO_VENTANA, sumarDias } from '../lib/tiempo.js';

/**
 * Paso 9 - Favoritos (US-EXP-06).
 *
 * Se marcan sobre todo cocineros y platos que el cliente YA PROBO: el favorito
 * nace de una buena experiencia, no de un listado al azar. Los que no pidio
 * nunca entran con menor probabilidad y solo si le quedan cerca, que es como
 * se descubre a alguien en el feed.
 *
 * Las dos tablas son distintas a proposito (`favorito_cocinero` y
 * `favorito_publicacion`): asi cada FK puede ser NOT NULL y la base impide por
 * si sola un favorito que no apunte a nada.
 */

/** Cocineros a los que este cliente le compro alguna vez. */
function cocinerosConocidos(
  contexto: ContextoSeed,
  cliente: UsuarioCreado,
): Set<string> {
  const conocidos = new Set<string>();
  for (const ped of contexto.pedidos) {
    if (ped.clienteId === cliente.id) conocidos.add(ped.cocineroId);
  }
  return conocidos;
}

/** Publicaciones que este cliente recibio en un pedido completado. */
function platosProbados(
  contexto: ContextoSeed,
  cliente: UsuarioCreado,
): Set<string> {
  const probados = new Set<string>();
  for (const ped of contexto.pedidos) {
    if (ped.clienteId !== cliente.id || ped.desenlace !== 'COMPLETADO')
      continue;
    for (const item of ped.items) probados.add(item.publicacionId);
  }
  return probados;
}

function fechaDeFavorito(contexto: ContextoSeed): Date {
  const dias = contexto.azar.entero(0, 170);
  const propuesta = sumarDias(INICIO_VENTANA, dias);
  return propuesta > FIN_VENTANA ? FIN_VENTANA : propuesta;
}

async function sembrarCocinerosFavoritos(
  contexto: ContextoSeed,
): Promise<void> {
  const { azar } = contexto;
  const filas = [];

  for (const cliente of contexto.clientes) {
    const conocidos = cocinerosConocidos(contexto, cliente);

    for (const cocineroCreado of contexto.cocineros) {
      const lejania =
        cliente.ubicacion && cocineroCreado.ubicacion
          ? distanciaKm(cliente.ubicacion, cocineroCreado.ubicacion)
          : 20;

      // Le pidio y le gusto: chance alta. No lo conoce: solo si esta cerca.
      const chance = conocidos.has(cocineroCreado.id)
        ? 0.45
        : Math.max(0, 0.2 - lejania / 100);

      if (!azar.probabilidad(chance)) continue;

      filas.push({
        clienteId: cliente.id,
        cocineroId: cocineroCreado.id,
        fechaCreacion: fechaDeFavorito(contexto),
      });
    }
  }

  if (filas.length > 0) await db.insert(favoritoCocinero).values(filas);
}

async function sembrarPlatosFavoritos(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const filas = [];

  for (const cliente of contexto.clientes) {
    // Se calcula una sola vez por cliente: dentro del filtro recorreria los
    // 750 pedidos por cada una de las 90 publicaciones.
    const yaProbados = platosProbados(contexto, cliente);
    const probados = contexto.publicaciones.filter((p) => yaProbados.has(p.id));
    const noProbados = contexto.publicaciones.filter(
      (p) => !yaProbados.has(p.id),
    );

    const elegidos = [
      ...azar.elegirVarios(
        probados,
        Math.min(probados.length, azar.entero(4, 9)),
      ),
      ...azar.elegirVarios(noProbados, azar.entero(1, 4)),
    ];

    for (const publicacion of elegidos) {
      filas.push({
        clienteId: cliente.id,
        publicacionId: publicacion.id,
        fechaCreacion: fechaDeFavorito(contexto),
      });
    }
  }

  if (filas.length > 0) await db.insert(favoritoPublicacion).values(filas);
}

export async function sembrarFavoritos(contexto: ContextoSeed): Promise<void> {
  await sembrarCocinerosFavoritos(contexto);
  await sembrarPlatosFavoritos(contexto);
}
