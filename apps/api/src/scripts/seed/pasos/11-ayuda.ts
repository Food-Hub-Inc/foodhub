import {
  adjuntoTicket,
  capituloAyuda,
  faq,
  seccionAyuda,
  ticketSoporte,
} from '@foodhub/db';
import { db } from '../../../lib/db.js';
import { CAPITULOS_AYUDA, FAQ } from '../datos/ayuda.js';
import { TICKETS } from '../datos/textos.js';
import { metadatosDeImagen, subirImagen } from '../lib/almacenamiento.js';
import type { ContextoSeed } from '../lib/contexto.js';
import { FIN_VENTANA, sumarDias } from '../lib/tiempo.js';
import { usuarioPorSlug } from '../lib/contexto.js';

/**
 * Paso 11 - Manual de ayuda, preguntas frecuentes y tickets de soporte
 * (US-AYU-01, US-AYU-02, US-AYU-03, US-AYU-05).
 *
 * El `orden` de capitulos y secciones se toma de la posicion en el arreglo:
 * el manual sigue una secuencia didactica que definio el administrador, no el
 * orden en que se cargaron las filas.
 *
 * SOBRE LOS ADJUNTOS DE LOS TICKETS
 *
 * `adjunto_ticket` guarda una URL de un archivo subido por el usuario, pero
 * hoy la API no tiene endpoint de carga para ese caso y no hay bucket asignado.
 * La seed los sube al bucket `configuracion`, bajo `tickets/{ticketId}/`.
 * ES UNA DECISION DE LA SEED, no una convencion del sistema: cuando se
 * implemente la subida de US-AYU-05 hay que alinear esta ruta con la que
 * defina `almacenamiento.service.ts` y volver a correr el script.
 */

async function sembrarManual(contexto: ContextoSeed): Promise<void> {
  // Los capitulos se numeran por rol: cada manual empieza en 1.
  const ordenPorRol = new Map<string, number>();

  for (const capitulo of CAPITULOS_AYUDA) {
    const rolId = contexto.rolesDestino.get(capitulo.rol);
    if (!rolId) throw new Error(`falta el rol destino ${capitulo.rol}`);

    const orden = (ordenPorRol.get(capitulo.rol) ?? 0) + 1;
    ordenPorRol.set(capitulo.rol, orden);

    const [fila] = await db
      .insert(capituloAyuda)
      .values({
        titulo: capitulo.titulo,
        rolDestinoId: rolId,
        orden,
        activo: capitulo.activo,
      })
      .returning({ id: capituloAyuda.id });

    if (!fila)
      throw new Error(`no se pudo crear el capítulo ${capitulo.titulo}`);

    await db.insert(seccionAyuda).values(
      capitulo.secciones.map((seccion, indice) => ({
        capituloId: fila.id,
        titulo: seccion.titulo,
        contenidoHtml: seccion.contenidoHtml,
        rolDestinoId: rolId,
        orden: indice + 1,
        habilitado: seccion.habilitado,
      })),
    );
  }
}

/**
 * Los contadores de votos no son al azar puro: una respuesta util junta
 * pulgares arriba y las tibias reparten. Es lo que hace que el orden por
 * utilidad de PAN-AYU-02 tenga algo que ordenar.
 */
async function sembrarFaq(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;

  await db.insert(faq).values(
    FAQ.map((pregunta) => {
      const rolId = contexto.rolesDestino.get(pregunta.rol);
      if (!rolId) throw new Error(`falta el rol destino ${pregunta.rol}`);
      const utiles = azar.entero(4, 60);
      return {
        pregunta: pregunta.pregunta,
        respuesta: pregunta.respuesta,
        categoria: pregunta.categoria,
        rolDestinoId: rolId,
        votosUtil: utiles,
        votosNoUtil: Math.round(utiles * (azar.flotante() * 0.35)),
        activo: true,
      };
    }),
  );
}

async function sembrarTickets(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;

  for (const [indice, semilla] of TICKETS.entries()) {
    const autor = usuarioPorSlug(contexto, semilla.autor);
    const tipoId = contexto.tiposConsulta.get(semilla.tipoConsulta);
    if (!tipoId) {
      throw new Error(`falta el tipo de consulta "${semilla.tipoConsulta}"`);
    }

    // Los mas viejos son los cerrados y los recientes los que siguen abiertos:
    // es como se ve una bandeja de soporte que se atiende.
    const antiguedad =
      semilla.estado === 'CERRADO' ? azar.entero(40, 120) : azar.entero(1, 20);
    const fechaCreacion = sumarDias(FIN_VENTANA, -antiguedad);

    const [fila] = await db
      .insert(ticketSoporte)
      .values({
        usuarioId: autor.id,
        tipoConsultaId: tipoId,
        asunto: semilla.asunto,
        descripcion: semilla.descripcion,
        estadoTicket: semilla.estado,
        fechaCreacion,
      })
      .returning({ id: ticketSoporte.id });

    if (!fila) throw new Error(`no se pudo crear el ticket ${String(indice)}`);
    if (!semilla.adjunto) continue;

    const { tipoMime, tamanoBytes } = metadatosDeImagen(
      semilla.adjunto.archivoLocal,
    );
    const archivoUrl = await subirImagen({
      bucket: 'configuracion',
      carpeta: `tickets/${fila.id}`,
      archivoLocal: semilla.adjunto.archivoLocal,
    });

    await db.insert(adjuntoTicket).values({
      ticketId: fila.id,
      archivoUrl,
      nombreArchivo: semilla.adjunto.nombre,
      tipoMime,
      tamanoBytes,
    });
  }
}

export async function sembrarAyudaYSoporte(
  contexto: ContextoSeed,
): Promise<void> {
  await sembrarManual(contexto);
  await sembrarFaq(contexto);
  await sembrarTickets(contexto);
}
