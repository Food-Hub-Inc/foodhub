import { desc, eq } from 'drizzle-orm';
import {
  categoria,
  favoritoCocinero,
  favoritoPublicacion,
  publicacion,
  usuario,
} from '@foodhub/db';
import type { Favoritos, FavoritoRespuesta } from '@foodhub/shared';
import { db } from '../../lib/db.js';
import {
  aValoracion,
  subconsultaValoracionPorCocinero,
  subconsultaValoracionPorPublicacion,
} from '../../lib/valoraciones.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import {
  aCocineroResumen,
  aPublicacionResumen,
  cocineroVisible,
  columnasCocinero,
  columnasPublicacion,
  publicacionVisible,
  todas,
} from './consultas.js';

/**
 * US-EXP-06 - Favoritos de cocinero y de publicacion.
 *
 * DOS DECISIONES QUE VALEN PARA TODO EL ARCHIVO
 *
 *   LA BAJA NO BORRA NADA AJENO. El ultimo criterio de la historia dice que un
 *   cocinero dado de baja "se elimina automaticamente de la lista de favoritos
 *   del cliente sin mostrar error" y que "la pestana se actualiza en el proximo
 *   acceso del usuario". Eso se implementa FILTRANDO AL LEER
 *   (`cocineroVisible()`), no con un DELETE disparado por la baja: la fila del
 *   favorito se conserva, asi que si el administrador rehabilita la cuenta
 *   (US-GURP-08) el favorito del cliente sigue ahi. Un borrado seria
 *   irreversible y la historia no lo pide.
 *
 *   EL ALTA ES IDEMPOTENTE. Los indices `favorito_cocinero_uq` y
 *   `favorito_publicacion_uq` ya impiden el duplicado, asi que el alta usa
 *   `onConflictDoNothing` en lugar de consultar antes si existe: una consulta
 *   previa no evita nada -entre el SELECT y el INSERT cabe otro toque del mismo
 *   usuario en otro dispositivo- y agrega una vuelta a la base. El endpoint es
 *   un PUT justamente por eso: tocar dos veces el corazon deja el mismo estado.
 */

// ---------------------------------------------------------------------------
// Lectura: la seccion "Mis favoritos"
// ---------------------------------------------------------------------------

/**
 * US-EXP-06 - Las dos pestanas de "Mis favoritos".
 *
 * Las dos consultas van en paralelo: son independientes entre si y la pantalla
 * dibuja las dos pestanas desde el primer render.
 *
 * Orden: lo ultimo que el cliente guardo, primero. La historia no fija un
 * criterio, y este es el unico que no obliga al usuario a buscar lo que acaba de
 * marcar. Se desempata por id para que la paginacion futura sea estable.
 */
export async function obtenerFavoritos(clienteId: string): Promise<Favoritos> {
  const valoracionCocinero = subconsultaValoracionPorCocinero();
  const valoracionPublicacion = subconsultaValoracionPorPublicacion();

  const [cocineros, publicaciones] = await Promise.all([
    db
      .select({
        ...columnasCocinero,
        valoracionPromedio: valoracionCocinero.promedio,
      })
      .from(favoritoCocinero)
      .innerJoin(usuario, eq(usuario.id, favoritoCocinero.cocineroId))
      .leftJoin(
        valoracionCocinero.tabla,
        eq(valoracionCocinero.tabla.cocineroId, usuario.id),
      )
      .where(
        todas([
          eq(favoritoCocinero.clienteId, clienteId),
          ...cocineroVisible(),
        ]),
      )
      .orderBy(desc(favoritoCocinero.fechaCreacion), desc(favoritoCocinero.id)),

    db
      .select({
        ...columnasPublicacion,
        valoracionPromedio: valoracionPublicacion.promedio,
      })
      .from(favoritoPublicacion)
      .innerJoin(
        publicacion,
        eq(publicacion.id, favoritoPublicacion.publicacionId),
      )
      .innerJoin(categoria, eq(categoria.id, publicacion.categoriaId))
      .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
      .leftJoin(
        valoracionPublicacion.tabla,
        eq(valoracionPublicacion.tabla.publicacionId, publicacion.id),
      )
      .where(
        todas([
          eq(favoritoPublicacion.clienteId, clienteId),
          ...publicacionVisible(),
        ]),
      )
      .orderBy(
        desc(favoritoPublicacion.fechaCreacion),
        desc(favoritoPublicacion.id),
      ),
  ]);

  return {
    cocineros: cocineros.map((fila) => ({
      ...aCocineroResumen(fila),
      valoracionPromedio: aValoracion(fila.valoracionPromedio),
    })),
    publicaciones: publicaciones.map((fila) => ({
      ...aPublicacionResumen(fila),
      valoracionPromedio: aValoracion(fila.valoracionPromedio),
    })),
  };
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/**
 * Verifica que el cocinero exista y sea alcanzable antes de guardarlo.
 *
 * Sin esta comprobacion, la FK del favorito rechazaria un id inexistente con un
 * error de base -que el manejador central traduce a un 500 genérico- en vez del
 * 404 que corresponde. Y una cuenta suspendida SI pasaria la FK: no se puede
 * guardar como favorito a alguien que el cliente no puede ver.
 */
async function exigirCocineroVisible(cocineroId: string): Promise<void> {
  const [existe] = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(todas([eq(usuario.id, cocineroId), ...cocineroVisible()]))
    .limit(1);

  if (!existe) throw noEncontrado('el cocinero');
}

/** Mismo criterio que `exigirCocineroVisible`, para la publicacion. */
async function exigirPublicacionVisible(publicacionId: string): Promise<void> {
  const [existe] = await db
    .select({ id: publicacion.id })
    .from(publicacion)
    .innerJoin(usuario, eq(usuario.id, publicacion.cocineroId))
    .where(todas([eq(publicacion.id, publicacionId), ...publicacionVisible()]))
    .limit(1);

  if (!existe) throw noEncontrado('la publicación');
}

/** US-EXP-06 - Guarda un cocinero en favoritos. */
export async function marcarCocineroFavorito(entrada: {
  clienteId: string;
  cocineroId: string;
}): Promise<FavoritoRespuesta> {
  await exigirCocineroVisible(entrada.cocineroId);

  await db
    .insert(favoritoCocinero)
    .values({
      clienteId: entrada.clienteId,
      cocineroId: entrada.cocineroId,
    })
    .onConflictDoNothing();

  return { esFavorito: true };
}

/**
 * US-EXP-06 - Quita un cocinero de favoritos.
 *
 * No verifica que el favorito exista: borrar algo que ya no esta deja el mismo
 * estado que el cliente pidio. Un 404 aca romperia la reversion optimista de la
 * interfaz por un caso que no es un error.
 */
export async function desmarcarCocineroFavorito(entrada: {
  clienteId: string;
  cocineroId: string;
}): Promise<FavoritoRespuesta> {
  await db
    .delete(favoritoCocinero)
    .where(
      todas([
        eq(favoritoCocinero.clienteId, entrada.clienteId),
        eq(favoritoCocinero.cocineroId, entrada.cocineroId),
      ]),
    );

  return { esFavorito: false };
}

/** US-EXP-06 - Guarda una publicacion en favoritos. */
export async function marcarPublicacionFavorita(entrada: {
  clienteId: string;
  publicacionId: string;
}): Promise<FavoritoRespuesta> {
  await exigirPublicacionVisible(entrada.publicacionId);

  await db
    .insert(favoritoPublicacion)
    .values({
      clienteId: entrada.clienteId,
      publicacionId: entrada.publicacionId,
    })
    .onConflictDoNothing();

  return { esFavorito: true };
}

/** US-EXP-06 - Quita una publicacion de favoritos. */
export async function desmarcarPublicacionFavorita(entrada: {
  clienteId: string;
  publicacionId: string;
}): Promise<FavoritoRespuesta> {
  await db
    .delete(favoritoPublicacion)
    .where(
      todas([
        eq(favoritoPublicacion.clienteId, entrada.clienteId),
        eq(favoritoPublicacion.publicacionId, entrada.publicacionId),
      ]),
    );

  return { esFavorito: false };
}
