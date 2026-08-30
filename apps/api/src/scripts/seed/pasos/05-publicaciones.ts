import { publicacion } from '@foodhub/db';
import { db } from '../../../lib/db.js';
import { platosPorCategoria, type SemillaPlato } from '../datos/platos.js';
import { subirImagen } from '../lib/almacenamiento.js';
import type { ContextoSeed, UsuarioCreado } from '../lib/contexto.js';
import { sumarDias } from '../lib/tiempo.js';

/**
 * Paso 5 - Publicaciones (US-PUB-01).
 *
 * Cada cocinero publica entre cinco y ocho platos de sus especialidades. El
 * mismo plato lo publican varios cocineros a PRECIOS DISTINTOS: es lo que hace
 * que el filtro por rango de precio y el orden por precio del feed (US-EXP-03)
 * devuelvan algo interesante en vez de una lista con un unico valor repetido.
 *
 * Cada publicacion sube su propia copia de la foto a la carpeta del cocinero
 * dentro del bucket `publicaciones`, exactamente como hace la app: la carpeta
 * se nombra por cocinero y no por publicacion porque la foto se sube ANTES de
 * que exista la fila (ver `crearUrlDeCargaDeFotoPlato`).
 */

/**
 * Precio del plato para este cocinero.
 *
 * Se redondea a los 100 pesos: un precio de 14.237 delata que lo genero un
 * script, y las capturas de la Etapa 6 tienen que parecer datos reales.
 */
function precioDe(base: number, factor: number): number {
  return Math.round((base * factor) / 100) * 100;
}

function platosDelCocinero(
  cocineroSemilla: UsuarioCreado,
  contexto: ContextoSeed,
): SemillaPlato[] {
  const { azar } = contexto;
  const candidatos = (cocineroSemilla.especialidades ?? []).flatMap(
    (categoria) => platosPorCategoria(categoria),
  );

  if (candidatos.length === 0) {
    throw new Error(`${cocineroSemilla.slug} no tiene especialidades cargadas`);
  }

  const cuantos = Math.min(candidatos.length, azar.entero(5, 8));
  return azar.elegirVarios(candidatos, cuantos);
}

async function publicarPlato(entrada: {
  contexto: ContextoSeed;
  cocineroCreado: UsuarioCreado;
  plato: SemillaPlato;
}): Promise<void> {
  const { contexto, cocineroCreado, plato } = entrada;
  const { azar } = contexto;

  const categoriaId = contexto.categorias.get(plato.categoria);
  if (!categoriaId) {
    throw new Error(`falta la categoría ${plato.categoria} en el contexto`);
  }

  const imagenUrl = await subirImagen({
    bucket: 'publicaciones',
    carpeta: cocineroCreado.id,
    archivoLocal: `platos/${plato.imagen}`,
  });

  const precio = precioDe(plato.precioBase, 0.85 + azar.flotante() * 0.35);
  const estado = azar.pesado({
    DISPONIBLE: 78,
    ULTIMAS_UNIDADES: 12,
    NO_DISPONIBLE: 10,
  });

  // Publica dentro de los diez dias de haberse registrado. El paso de pedidos
  // no genera pedidos antes de los catorce, asi que ninguna publicacion puede
  // recibir un pedido anterior a su propia alta.
  const fechaCreacion = sumarDias(
    cocineroCreado.fechaRegistro,
    azar.entero(1, 10),
  );

  // Una de cada tres publicaciones fue editada despues (US-PUB-02): asi la
  // pantalla de detalle tiene con que mostrar "editado el ...".
  const fechaUltimaEdicion = azar.probabilidad(0.33)
    ? sumarDias(fechaCreacion, azar.entero(5, 60))
    : null;

  const [fila] = await db
    .insert(publicacion)
    .values({
      cocineroId: cocineroCreado.id,
      categoriaId,
      nombre: plato.nombre,
      descripcion: plato.descripcion,
      precio: precio.toFixed(2),
      imagenUrl,
      estadoPublicacion: estado,
      tiempoEstimadoPreparacion: plato.tiempoPreparacion + azar.entero(-10, 10),
      activo: true,
      fechaCreacion,
      fechaUltimaEdicion,
    })
    .returning({ id: publicacion.id });

  if (!fila) throw new Error(`no se pudo publicar ${plato.nombre}`);

  contexto.publicaciones.push({
    id: fila.id,
    cocineroId: cocineroCreado.id,
    cocineroSlug: cocineroCreado.slug,
    plato,
    precio,
    imagenUrl,
    estado,
    fechaCreacion,
  });
}

export async function sembrarPublicaciones(
  contexto: ContextoSeed,
): Promise<void> {
  for (const cocineroCreado of contexto.cocineros) {
    for (const plato of platosDelCocinero(cocineroCreado, contexto)) {
      await publicarPlato({ contexto, cocineroCreado, plato });
    }
  }
}
