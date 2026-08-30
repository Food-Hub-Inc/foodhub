import { eq } from 'drizzle-orm';
import {
  categoria,
  configuracionSistema,
  motivoCancelacion,
  rolDestino,
  tipoConsulta,
  tipoUsuarioCancelacion,
} from '@foodhub/db';
import { db } from '../../../lib/db.js';
import {
  CATEGORIAS,
  CONFIGURACION_SISTEMA,
  MOTIVOS_CANCELACION,
  ROLES_DESTINO,
  TIPOS_CONSULTA,
  TIPOS_USUARIO_CANCELACION,
} from '../datos/catalogo.js';
import { subirImagen } from '../lib/almacenamiento.js';
import type { ContextoSeed } from '../lib/contexto.js';

/**
 * Paso 2 - Entidades de referencia.
 *
 * Va primero porque casi todo lo demas depende de el: una publicacion
 * necesita categoria, un pedido cancelado necesita motivo, un ticket necesita
 * tipo de consulta y el manual de ayuda necesita rol destino.
 *
 * Incluye las filas que sembraban las migraciones 0003, 0004 y 0012. El reset
 * las borro y esas migraciones ya figuran aplicadas, de modo que no vuelven a
 * correr: si la seed no las repone, la plataforma arranca sin parametros.
 */

async function sembrarCategorias(contexto: ContextoSeed): Promise<void> {
  for (const semilla of CATEGORIAS) {
    const [fila] = await db
      .insert(categoria)
      .values({
        nombre: semilla.nombre,
        descripcion: semilla.descripcion,
        activo: semilla.activo,
      })
      .returning({ id: categoria.id });

    if (!fila)
      throw new Error(`no se pudo crear la categoría ${semilla.nombre}`);

    // La imagen se sube DESPUES de tener el id, porque la carpeta del bucket
    // se nombra con el id de la categoria (ver almacenamiento.service.ts).
    const url = await subirImagen({
      bucket: 'configuracion',
      carpeta: fila.id,
      archivoLocal: `categorias/${semilla.imagen}`,
    });

    await db
      .update(categoria)
      .set({ imagenPredeterminadaUrl: url })
      .where(eq(categoria.id, fila.id));

    contexto.categorias.set(semilla.slug, fila.id);
  }
}

async function sembrarMotivosDeCancelacion(
  contexto: ContextoSeed,
): Promise<void> {
  const tipos = await db
    .insert(tipoUsuarioCancelacion)
    .values(
      TIPOS_USUARIO_CANCELACION.map((nombre) => ({
        nombreTipoUsuarioCancelacion: nombre,
      })),
    )
    .returning();

  const porNombre = new Map(
    tipos.map((fila) => [fila.nombreTipoUsuarioCancelacion, fila.id]),
  );

  for (const semilla of MOTIVOS_CANCELACION) {
    const tipoId = porNombre.get(semilla.aplicableA);
    if (!tipoId) {
      throw new Error(`falta el tipo de cancelación ${semilla.aplicableA}`);
    }

    const [fila] = await db
      .insert(motivoCancelacion)
      .values({
        nombre: semilla.nombre,
        tipoUsuarioCancelacionId: tipoId,
        activo: semilla.activo,
      })
      .returning({ id: motivoCancelacion.id });

    if (!fila) throw new Error(`no se pudo crear el motivo ${semilla.nombre}`);

    contexto.motivosCancelacion.push({
      id: fila.id,
      nombre: semilla.nombre,
      aplicableA: semilla.aplicableA,
      activo: semilla.activo,
    });
  }
}

export async function sembrarCatalogo(contexto: ContextoSeed): Promise<void> {
  const roles = await db
    .insert(rolDestino)
    .values(ROLES_DESTINO.map((nombre) => ({ nombre })))
    .returning();
  for (const rol of roles) contexto.rolesDestino.set(rol.nombre, rol.id);

  const consultas = await db
    .insert(tipoConsulta)
    .values(
      TIPOS_CONSULTA.map((tipo) => ({
        nombreTipoConsulta: tipo.nombre,
        activo: tipo.activo,
      })),
    )
    .returning();
  for (const consulta of consultas) {
    contexto.tiposConsulta.set(consulta.nombreTipoConsulta, consulta.id);
  }

  await db.insert(configuracionSistema).values([...CONFIGURACION_SISTEMA]);

  await sembrarMotivosDeCancelacion(contexto);
  await sembrarCategorias(contexto);
}
