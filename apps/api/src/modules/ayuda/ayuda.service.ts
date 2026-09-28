import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  type SQL,
} from 'drizzle-orm';
import { capituloAyuda, faq, rolDestino, seccionAyuda } from '@foodhub/db';
import type {
  CapituloAyudaListado,
  CrearCapituloAyudaInput,
  CrearFaqAdminInput,
  EditarCapituloAyudaInput,
  EditarFaqAdminInput,
  FaqAdminListado,
  FiltrosCapitulosAyuda,
  FiltrosFaqsAdmin,
  PaginaCapitulosAyuda,
  PaginaFaqsAdmin,
  RolDestinoAyuda,
  SeccionAyudaInput,
  SeccionAyudaListado,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { sanitizarContenidoAyuda } from '../../lib/contenidoHtml.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

/**
 * Modulo de Ayuda y soporte — gestion del manual de usuario y las preguntas
 * frecuentes desde el panel web (US-AYU-05).
 *
 * El contrato expone el CODIGO del rol destinatario; este servicio traduce
 * codigo <-> id de `rol_destino`, igual que `motivosCancelacion.service.ts`.
 * Las secciones heredan el rol del capitulo: el administrador no elige rol por
 * seccion, y el formulario de la US solo lo pide a nivel de capitulo.
 *
 * El HTML lo redacta un administrador y lo ve toda la plataforma: se sanea
 * antes de guardarlo, sin confiar en el editor.
 */

type FilaCapitulo = typeof capituloAyuda.$inferSelect;
type FilaSeccion = typeof seccionAyuda.$inferSelect;
type FilaFaq = typeof faq.$inferSelect;
type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Id de la fila de `rol_destino` para un codigo del contrato. */
async function resolverIdDeRol(codigo: RolDestinoAyuda): Promise<string> {
  const [fila] = await db
    .select({ id: rolDestino.id })
    .from(rolDestino)
    .where(eq(rolDestino.nombre, codigo))
    .limit(1);

  // No puede pasar contra una base migrada: la migracion 0017 siembra AMBOS.
  if (!fila) {
    throw new Error(
      `Falta sembrar rol_destino para "${codigo}". Corré pnpm db:migrate.`,
    );
  }
  return fila.id;
}

function patronDe(busqueda: string): string {
  return `%${busqueda.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
}

function aSeccionListado(fila: FilaSeccion): SeccionAyudaListado {
  return {
    id: fila.id,
    titulo: fila.titulo,
    contenidoHtml: fila.contenidoHtml,
    habilitado: fila.habilitado,
    orden: fila.orden,
  };
}

function aCapituloListado(
  fila: FilaCapitulo,
  rolDestinoCodigo: RolDestinoAyuda,
  secciones: SeccionAyudaListado[],
): CapituloAyudaListado {
  return {
    id: fila.id,
    titulo: fila.titulo,
    rolDestino: rolDestinoCodigo,
    orden: fila.orden,
    activo: fila.activo,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaUltimaModificacion: fila.fechaUltimaModificacion.toISOString(),
    secciones,
  };
}

// ---------------------------------------------------------------------------
// Manual de usuario — lectura
// ---------------------------------------------------------------------------

function armarFiltroCapitulos(
  filtros: FiltrosCapitulosAyuda,
  idRol: string | undefined,
): SQL | undefined {
  const condiciones: SQL[] = [];
  if (filtros.busqueda) {
    condiciones.push(ilike(capituloAyuda.titulo, patronDe(filtros.busqueda)));
  }
  if (idRol) condiciones.push(eq(capituloAyuda.rolDestinoId, idRol));
  if (filtros.estado) {
    condiciones.push(eq(capituloAyuda.activo, filtros.estado === 'HABILITADO'));
  }
  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

async function seccionesDeCapitulos(
  ids: string[],
): Promise<Map<string, SeccionAyudaListado[]>> {
  if (ids.length === 0) return new Map();

  const filas = await db
    .select()
    .from(seccionAyuda)
    .where(inArray(seccionAyuda.capituloId, ids))
    .orderBy(asc(seccionAyuda.orden), asc(seccionAyuda.titulo));

  const mapa = new Map<string, SeccionAyudaListado[]>();
  for (const fila of filas) {
    const lista = mapa.get(fila.capituloId) ?? [];
    lista.push(aSeccionListado(fila));
    mapa.set(fila.capituloId, lista);
  }
  return mapa;
}

/** US-AYU-05 - Listado paginado del manual, con sus secciones. */
export async function listarCapitulos(
  filtros: FiltrosCapitulosAyuda,
): Promise<PaginaCapitulosAyuda> {
  const idRol = filtros.rolDestino
    ? await resolverIdDeRol(filtros.rolDestino)
    : undefined;
  const filtro = armarFiltroCapitulos(filtros, idRol);

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({ capitulo: capituloAyuda, rol: rolDestino.nombre })
      .from(capituloAyuda)
      .innerJoin(rolDestino, eq(rolDestino.id, capituloAyuda.rolDestinoId))
      .where(filtro)
      .orderBy(asc(capituloAyuda.orden), asc(capituloAyuda.titulo))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(capituloAyuda).where(filtro),
  ]);

  const secciones = await seccionesDeCapitulos(
    filas.map((fila) => fila.capitulo.id),
  );

  return {
    datos: filas.map((fila) =>
      aCapituloListado(
        fila.capitulo,
        fila.rol as RolDestinoAyuda,
        secciones.get(fila.capitulo.id) ?? [],
      ),
    ),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/**
 * US-AYU-05 - Un capitulo puntual del manual, con sus secciones.
 *
 * Lo consume la pagina de edicion del panel, que necesita cargarlo por id al
 * entrar o al refrescar la URL: no puede depender del estado de navegacion del
 * listado.
 */
export async function obtenerCapitulo(
  capituloId: string,
): Promise<CapituloAyudaListado> {
  const [fila] = await db
    .select({ capitulo: capituloAyuda, rol: rolDestino.nombre })
    .from(capituloAyuda)
    .innerJoin(rolDestino, eq(rolDestino.id, capituloAyuda.rolDestinoId))
    .where(eq(capituloAyuda.id, capituloId))
    .limit(1);

  if (!fila) throw noEncontrado('el capítulo de ayuda');

  const secciones = await seccionesDeCapitulos([capituloId]);
  return aCapituloListado(
    fila.capitulo,
    fila.rol as RolDestinoAyuda,
    secciones.get(capituloId) ?? [],
  );
}

// ---------------------------------------------------------------------------
// Manual de usuario — escritura
// ---------------------------------------------------------------------------

async function insertarSecciones(
  tx: Transaccion,
  capituloId: string,
  rolDestinoId: string,
  secciones: SeccionAyudaInput[],
): Promise<FilaSeccion[]> {
  if (secciones.length === 0) return [];
  return tx
    .insert(seccionAyuda)
    .values(
      secciones.map((seccion, indice) => ({
        capituloId,
        titulo: seccion.titulo,
        contenidoHtml: sanitizarContenidoAyuda(seccion.contenidoHtml),
        rolDestinoId,
        orden: seccion.orden ?? indice,
      })),
    )
    .returning();
}

/** US-AYU-05 - Alta de capitulo con sus secciones, en una transaccion. */
export async function crearCapitulo(entrada: {
  datos: CrearCapituloAyudaInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<CapituloAyudaListado> {
  const rolDestinoId = await resolverIdDeRol(entrada.datos.rolDestino);

  const { capitulo, secciones } = await db.transaction(async (tx) => {
    const [insertado] = await tx
      .insert(capituloAyuda)
      .values({
        titulo: entrada.datos.titulo,
        rolDestinoId,
        orden: entrada.datos.orden ?? 0,
      })
      .returning();
    if (!insertado) throw new Error('el alta de capítulo no devolvió fila.');

    const insertadas = await insertarSecciones(
      tx,
      insertado.id,
      rolDestinoId,
      entrada.datos.secciones,
    );
    return { capitulo: insertado, secciones: insertadas };
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'capitulo_ayuda',
    objetoAfectadoId: capitulo.id,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      titulo: capitulo.titulo,
      rolDestino: entrada.datos.rolDestino,
      cantidadSecciones: secciones.length,
    },
  });

  return aCapituloListado(
    capitulo,
    entrada.datos.rolDestino,
    secciones.map(aSeccionListado),
  );
}

/**
 * Sincroniza las secciones del capitulo con lo que manda el formulario:
 * actualiza las que traen `id`, inserta las nuevas y elimina las quitadas.
 * Conserva el `id` de las secciones existentes para no perder sus fechas.
 */
async function sincronizarSecciones(
  tx: Transaccion,
  capituloId: string,
  rolDestinoId: string,
  secciones: SeccionAyudaInput[],
): Promise<void> {
  const idsEnviados = secciones
    .map((seccion) => seccion.id)
    .filter((id): id is string => id !== undefined);

  if (idsEnviados.length > 0) {
    await tx
      .delete(seccionAyuda)
      .where(
        and(
          eq(seccionAyuda.capituloId, capituloId),
          notInArray(seccionAyuda.id, idsEnviados),
        ),
      );
  } else {
    await tx
      .delete(seccionAyuda)
      .where(eq(seccionAyuda.capituloId, capituloId));
  }

  for (const [indice, seccion] of secciones.entries()) {
    const orden = seccion.orden ?? indice;
    if (seccion.id) {
      await tx
        .update(seccionAyuda)
        .set({
          titulo: seccion.titulo,
          contenidoHtml: sanitizarContenidoAyuda(seccion.contenidoHtml),
          rolDestinoId,
          orden,
          fechaUltimaModificacion: new Date(),
        })
        .where(
          and(
            eq(seccionAyuda.id, seccion.id),
            eq(seccionAyuda.capituloId, capituloId),
          ),
        );
    } else {
      await tx.insert(seccionAyuda).values({
        capituloId,
        titulo: seccion.titulo,
        contenidoHtml: sanitizarContenidoAyuda(seccion.contenidoHtml),
        rolDestinoId,
        orden,
      });
    }
  }
}

/** US-AYU-05 - Edicion del capitulo: actualiza y registra la fecha de modificacion. */
export async function editarCapitulo(entrada: {
  capituloId: string;
  datos: EditarCapituloAyudaInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { capituloId, datos } = entrada;
  const idRol = datos.rolDestino
    ? await resolverIdDeRol(datos.rolDestino)
    : undefined;

  await db.transaction(async (tx) => {
    const [actualizado] = await tx
      .update(capituloAyuda)
      .set({
        ...(datos.titulo !== undefined ? { titulo: datos.titulo } : {}),
        ...(datos.orden !== undefined ? { orden: datos.orden } : {}),
        ...(idRol !== undefined ? { rolDestinoId: idRol } : {}),
        fechaUltimaModificacion: new Date(),
      })
      .where(eq(capituloAyuda.id, capituloId))
      .returning();
    if (!actualizado) throw noEncontrado('el capítulo de ayuda');

    if (datos.secciones) {
      await sincronizarSecciones(
        tx,
        capituloId,
        idRol ?? actualizado.rolDestinoId,
        datos.secciones,
      );
    }
  });

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'capitulo_ayuda',
    objetoAfectadoId: capituloId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos) },
  });
}

/** US-AYU-05 - Habilitar o deshabilitar un capitulo (baja logica). */
export async function establecerHabilitacionCapitulo(entrada: {
  capituloId: string;
  activo: boolean;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const [fila] = await db
    .update(capituloAyuda)
    .set({ activo: entrada.activo, fechaUltimaModificacion: new Date() })
    .where(eq(capituloAyuda.id, entrada.capituloId))
    .returning({ id: capituloAyuda.id });
  if (!fila) throw noEncontrado('el capítulo de ayuda');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'capitulo_ayuda',
    objetoAfectadoId: entrada.capituloId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { activo: entrada.activo },
  });
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes — lectura
// ---------------------------------------------------------------------------

function armarFiltroFaqs(
  filtros: FiltrosFaqsAdmin,
  idRol: string | undefined,
): SQL | undefined {
  const condiciones: SQL[] = [];
  if (filtros.busqueda) {
    condiciones.push(ilike(faq.pregunta, patronDe(filtros.busqueda)));
  }
  if (idRol) condiciones.push(eq(faq.rolDestinoId, idRol));
  if (filtros.categoria) condiciones.push(eq(faq.categoria, filtros.categoria));
  if (filtros.estado) {
    condiciones.push(eq(faq.activo, filtros.estado === 'HABILITADO'));
  }
  return condiciones.length > 0 ? and(...condiciones) : undefined;
}

function aFaqListado(
  fila: FilaFaq,
  rolDestinoCodigo: RolDestinoAyuda,
): FaqAdminListado {
  return {
    id: fila.id,
    categoria: fila.categoria,
    pregunta: fila.pregunta,
    respuesta: fila.respuesta,
    rolDestino: rolDestinoCodigo,
    votosUtil: fila.votosUtil,
    votosNoUtil: fila.votosNoUtil,
    activo: fila.activo,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    fechaUltimaModificacion: fila.fechaUltimaModificacion.toISOString(),
  };
}

/** US-AYU-05 - Listado paginado de preguntas frecuentes. */
export async function listarFaqs(
  filtros: FiltrosFaqsAdmin,
): Promise<PaginaFaqsAdmin> {
  const idRol = filtros.rolDestino
    ? await resolverIdDeRol(filtros.rolDestino)
    : undefined;
  const filtro = armarFiltroFaqs(filtros, idRol);

  const [filas, [totalizador]] = await Promise.all([
    db
      .select({ faq, rol: rolDestino.nombre })
      .from(faq)
      .innerJoin(rolDestino, eq(rolDestino.id, faq.rolDestinoId))
      .where(filtro)
      .orderBy(desc(faq.fechaUltimaModificacion), asc(faq.pregunta))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(faq).where(filtro),
  ]);

  return {
    datos: filas.map((fila) =>
      aFaqListado(fila.faq, fila.rol as RolDestinoAyuda),
    ),
    total: totalizador?.total ?? 0,
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes — escritura
// ---------------------------------------------------------------------------

/** US-AYU-05 - Alta de pregunta frecuente. */
export async function crearFaq(entrada: {
  datos: CrearFaqAdminInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<FaqAdminListado> {
  const rolDestinoId = await resolverIdDeRol(entrada.datos.rolDestino);

  const [fila] = await db
    .insert(faq)
    .values({
      categoria: entrada.datos.categoria,
      pregunta: entrada.datos.pregunta,
      respuesta: entrada.datos.respuesta,
      rolDestinoId,
    })
    .returning();
  if (!fila) throw new Error('el alta de pregunta frecuente no devolvió fila.');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'ALTA',
    tipoObjeto: 'faq',
    objetoAfectadoId: fila.id,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      categoria: fila.categoria,
      rolDestino: entrada.datos.rolDestino,
    },
  });

  return aFaqListado(fila, entrada.datos.rolDestino);
}

/** US-AYU-05 - Edicion de la pregunta: registra la fecha de modificacion. */
export async function editarFaq(entrada: {
  faqId: string;
  datos: EditarFaqAdminInput;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const { faqId, datos } = entrada;
  const idRol = datos.rolDestino
    ? await resolverIdDeRol(datos.rolDestino)
    : undefined;

  const [fila] = await db
    .update(faq)
    .set({
      ...(datos.categoria !== undefined ? { categoria: datos.categoria } : {}),
      ...(datos.pregunta !== undefined ? { pregunta: datos.pregunta } : {}),
      ...(datos.respuesta !== undefined ? { respuesta: datos.respuesta } : {}),
      ...(idRol !== undefined ? { rolDestinoId: idRol } : {}),
      fechaUltimaModificacion: new Date(),
    })
    .where(eq(faq.id, faqId))
    .returning({ id: faq.id });
  if (!fila) throw noEncontrado('la pregunta frecuente');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'faq',
    objetoAfectadoId: faqId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { campos: Object.keys(datos) },
  });
}

/** US-AYU-05 - Habilitar o deshabilitar una pregunta (baja logica). */
export async function establecerHabilitacionFaq(entrada: {
  faqId: string;
  activo: boolean;
  administradorId: string;
  ipOrigen: string | null;
}): Promise<void> {
  const [fila] = await db
    .update(faq)
    .set({ activo: entrada.activo, fechaUltimaModificacion: new Date() })
    .where(eq(faq.id, entrada.faqId))
    .returning({ id: faq.id });
  if (!fila) throw noEncontrado('la pregunta frecuente');

  void registrarOperacion({
    usuarioId: entrada.administradorId,
    operacion: 'MODIFICACION',
    tipoObjeto: 'faq',
    objetoAfectadoId: entrada.faqId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: { activo: entrada.activo },
  });
}
