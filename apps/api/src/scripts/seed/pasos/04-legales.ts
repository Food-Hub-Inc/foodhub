import { sql } from 'drizzle-orm';
import { usuario, versionTerminos } from '@foodhub/db';
import { db } from '../../../lib/db.js';
import { VERSIONES_TERMINOS } from '../datos/legales.js';
import type { ContextoSeed } from '../lib/contexto.js';

/**
 * Paso 4 - Terminos y condiciones y politica de privacidad (US-CFG-04).
 *
 * Va DESPUES de los usuarios porque `version_terminos.admin_autor_id` apunta a
 * `usuario`: sin administradores cargados, la clave foranea rechaza la fila.
 *
 * POR QUE AL FINAL SE REESCRIBE LA FECHA DE ACEPTACION DE TODOS
 *
 * `calcularDebeAceptarTerminos` (usuarios.service.ts) compara la fecha en que
 * el usuario acepto contra la publicacion mas reciente entre las versiones
 * VIGENTES. Si es anterior, `GateDeSesion` de la app movil bloquea TODA la
 * navegacion y manda a la pantalla de re-aceptacion.
 *
 * Los usuarios del dataset se registraron entre enero y mayo, y la version
 * vigente se publico en agosto. Sin este ajuste, las 27 cuentas quedarian
 * atrapadas en esa pantalla al primer login y no se podria probar nada mas.
 * Se los deja re-aceptando la version vigente el dia que se publico, que es
 * lo que habria pasado de verdad.
 *
 * Para PROBAR esa pantalla, la via es la real: publicar una version nueva
 * desde PAN-ADM-04.
 */

export async function sembrarLegales(contexto: ContextoSeed): Promise<void> {
  const autores = contexto.administradores;
  if (autores.length === 0) {
    throw new Error('sembrarLegales necesita administradores ya creados');
  }

  let vigenteTerminos: { id: string; fechaPublicacion: Date } | undefined;

  for (const [indice, semilla] of VERSIONES_TERMINOS.entries()) {
    // Se reparten los autores para que el historial del panel no muestre
    // siempre al mismo administrador.
    const autor = autores[indice % autores.length];

    const [fila] = await db
      .insert(versionTerminos)
      .values({
        tipo: semilla.tipo,
        numeroVersion: semilla.numeroVersion,
        contenidoHtml: semilla.contenidoHtml,
        estadoVersionTerminos: semilla.estado,
        fechaPublicacion: semilla.fechaPublicacion,
        adminAutorId: autor?.id ?? null,
      })
      .returning({ id: versionTerminos.id });

    if (!fila) {
      throw new Error(
        `no se pudo crear ${semilla.tipo} v${String(semilla.numeroVersion)}`,
      );
    }

    if (semilla.tipo === 'TERMINOS' && semilla.estado === 'VIGENTE') {
      vigenteTerminos = {
        id: fila.id,
        fechaPublicacion: semilla.fechaPublicacion,
      };
    }
  }

  if (!vigenteTerminos) {
    throw new Error(
      'el dataset tiene que incluir una versión VIGENTE de TERMINOS',
    );
  }

  contexto.versionTerminosVigenteId = vigenteTerminos.id;

  // Un minuto despues de la publicacion: la aceptacion tiene que ser posterior
  // para que `fechaAceptacionTerminos < ultimaPublicacion` de falso.
  const aceptacion = new Date(
    vigenteTerminos.fechaPublicacion.getTime() + 60_000,
  );

  await db.update(usuario).set({
    terminosAceptados: true,
    // `greatest` conserva la fecha de alta de quien se registro DESPUES de la
    // publicacion: nadie puede haber aceptado antes de existir.
    fechaAceptacionTerminos: sql`greatest(${usuario.fechaRegistro}, ${aceptacion.toISOString()}::timestamptz)`,
    versionTerminosAceptadaId: vigenteTerminos.id,
  });
}
