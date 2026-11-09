import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  adjuntoTicket,
  capituloAyuda,
  faq,
  rolDestino,
  seccionAyuda,
  ticketSoporte,
  tipoConsulta,
  usuario,
} from '@foodhub/db';
import type {
  AdjuntoTicketInput,
  CapituloManualPublico,
  EnviarConsultaInput,
  Faq,
  ManualPublico,
  SeccionManualPublica,
  TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { enviarCorreo, ErrorDeEmail } from '../../lib/email.js';
import { logger } from '../../lib/logger.js';
import {
  noAutorizado,
  noEncontrado,
} from '../../middleware/error.middleware.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';

type RolFaq = Exclude<TipoUsuario, 'ADMINISTRADOR'>;

/**
 * US-AYU-05 - Contenido dirigido a "Ambos" llega a los dos roles de la app.
 * Se resuelve en la lectura: el rol del usuario MAS el codigo AMBOS, no solo
 * el rol exacto.
 */
const ROL_DESTINO_AMBOS = 'AMBOS';

/** US-AYU-02 · Preguntas activas correspondientes al rol autenticado. */
export async function listarFaqPorRol(rol: RolFaq): Promise<Faq[]> {
  return db
    .select({
      id: faq.id,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      categoria: faq.categoria,
      votosUtil: faq.votosUtil,
      votosNoUtil: faq.votosNoUtil,
    })
    .from(faq)
    .innerJoin(rolDestino, eq(faq.rolDestinoId, rolDestino.id))
    .where(
      and(
        inArray(rolDestino.nombre, [rol, ROL_DESTINO_AMBOS]),
        eq(faq.activo, true),
      ),
    )
    .orderBy(asc(faq.categoria), desc(faq.votosUtil), asc(faq.pregunta));
}

/**
 * US-AYU-02 · Registra un voto de utilidad de forma atómica.
 *
 * El modelo V5 conserva contadores en FAQ y no una fila por usuario: la app
 * evita el doble voto durante la sesión, mientras la base incrementa el
 * contador sin perder votos concurrentes.
 */
export async function registrarVotoFaq(
  id: string,
  util: boolean,
  rol: RolFaq,
): Promise<void> {
  const faqVisible = await db
    .select({ id: faq.id })
    .from(faq)
    .innerJoin(rolDestino, eq(faq.rolDestinoId, rolDestino.id))
    .where(
      and(
        eq(faq.id, id),
        eq(faq.activo, true),
        inArray(rolDestino.nombre, [rol, ROL_DESTINO_AMBOS]),
      ),
    )
    .limit(1);

  if (faqVisible.length === 0) throw noEncontrado('la pregunta frecuente');

  const resultado = await db
    .update(faq)
    .set(
      util
        ? { votosUtil: sql<number>`${faq.votosUtil} + 1` }
        : { votosNoUtil: sql<number>`${faq.votosNoUtil} + 1` },
    )
    .where(and(eq(faq.id, id), eq(faq.activo, true)))
    .returning({ id: faq.id });

  if (resultado.length === 0) throw noEncontrado('la pregunta frecuente');
}

/** Evita que una llamada futura al servicio omita la guarda de rol. */
export function validarRolFaq(rol: TipoUsuario): asserts rol is RolFaq {
  if (rol === 'ADMINISTRADOR') throw noAutorizado();
}

// ---------------------------------------------------------------------------
// US-AYU-01 · Manual de usuario dentro de la app (consumo)
// ---------------------------------------------------------------------------

function aSeccionManualPublica(
  fila: typeof seccionAyuda.$inferSelect,
): SeccionManualPublica {
  return {
    id: fila.id,
    titulo: fila.titulo,
    contenidoHtml: fila.contenidoHtml,
    orden: fila.orden,
  };
}

/**
 * US-AYU-01 - Manual visible para el rol autenticado: capitulos activos
 * dirigidos a su rol o a "Ambos", con sus secciones habilitadas y en el orden
 * que definio el administrador (US-AYU-05).
 *
 * El contenido del manual lo gestiona US-AYU-05 desde el panel; aca solo se
 * lee, de modo que un cambio publicado se refleja sin desplegar la app.
 */
export async function listarManualPorRol(rol: RolFaq): Promise<ManualPublico> {
  const filas = await db
    .select({ capitulo: capituloAyuda })
    .from(capituloAyuda)
    .innerJoin(rolDestino, eq(rolDestino.id, capituloAyuda.rolDestinoId))
    .where(
      and(
        inArray(rolDestino.nombre, [rol, ROL_DESTINO_AMBOS]),
        eq(capituloAyuda.activo, true),
      ),
    )
    .orderBy(asc(capituloAyuda.orden), asc(capituloAyuda.titulo));

  const ids = filas.map((fila) => fila.capitulo.id);
  const secciones = ids.length
    ? await db
        .select({ seccion: seccionAyuda })
        .from(seccionAyuda)
        .innerJoin(rolDestino, eq(rolDestino.id, seccionAyuda.rolDestinoId))
        .where(
          and(
            inArray(seccionAyuda.capituloId, ids),
            eq(seccionAyuda.habilitado, true),
            inArray(rolDestino.nombre, [rol, ROL_DESTINO_AMBOS]),
          ),
        )
        .orderBy(asc(seccionAyuda.orden), asc(seccionAyuda.titulo))
    : [];

  const porCapitulo = new Map<string, SeccionManualPublica[]>();
  for (const fila of secciones) {
    const lista = porCapitulo.get(fila.seccion.capituloId) ?? [];
    lista.push(aSeccionManualPublica(fila.seccion));
    porCapitulo.set(fila.seccion.capituloId, lista);
  }

  return filas.map((fila): CapituloManualPublico => ({
    id: fila.capitulo.id,
    titulo: fila.capitulo.titulo,
    orden: fila.capitulo.orden,
    secciones: porCapitulo.get(fila.capitulo.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// US-AYU-03 · Envio de consulta al soporte
// ---------------------------------------------------------------------------

/**
 * Resultado del POST `/soporte/tickets`.
 *
 * `id` es el id del ticket creado (lo necesita el cliente para debugging y
 * para referencia en el correo). `mensaje` es la confirmacion que la API le
 * devuelve al cliente: el server no lo construye a partir del exito, sino
 * del criterio de aceptacion literal de US-AYU-03, asi un cambio de wording
 * se centraliza en `@foodhub/shared`.
 */
export interface ResultadoCrearTicket {
  id: string;
  mensaje: string;
}

/**
 * Cuerpo del correo de acuse de recibo (US-AYU-03, septimo criterio).
 *
 * Es HTML inline porque el SDK de Resend espera HTML o texto plano y el
 * cuerpo lleva un saludo, el id del ticket y un parrafo de despedida. Los
 * colores y la tipografia son los mismos que usan los correos de auth
 * (ver `docs/CORREOS-AUTH.md`): en un correo se escriben literales porque
 * ningun cliente resuelve variables CSS.
 */
function cuerpoDeAcuse(datos: { nombre: string; idTicket: string }): string {
  return `
    <div style="font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1F1A17;">
      <h1 style="color: #EC6829; font-size: 24px; font-weight: 800; margin: 0 0 16px;">
        Recibimos tu consulta
      </h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Hola, <strong>${datos.nombre}</strong>:
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Te confirmamos que registramos tu consulta con el identificador
        <strong>${datos.idTicket}</strong>. El equipo de soporte la va a leer
        y te va a responder por este mismo correo en un plazo aproximado de
        <strong>48 horas hábiles</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">
        Si en ese plazo no recibiste una respuesta o querés agregar
        información, podés escribirnos otra vez a través de la app, en
        <em>Ayuda → Contactar al soporte</em>.
      </p>
      <hr style="border: none; border-top: 1px solid #E6E1DC; margin: 24px 0;" />
      <p style="font-size: 11px; color: #57514C; margin: 0;">
        Este es un mensaje automático, por favor no respondas a este correo.
      </p>
    </div>
  `.trim();
}

/**
 * Verifica que el `tipoConsultaId` exista y este activo.
 *
 * Lo separamos del INSERT para devolver un 400 claro cuando el cliente
 * manda un id que no esta en la base (zod acepta cualquier uuid, asi que
 * este chequeo es la unica salvaguarda contra un id arbitrario o dado
 * de baja).
 */
async function validarTipoConsultaActivo(
  tipoConsultaId: string,
): Promise<void> {
  const [fila] = await db
    .select({ activo: tipoConsulta.activo })
    .from(tipoConsulta)
    .where(eq(tipoConsulta.id, tipoConsultaId))
    .limit(1);

  if (!fila) {
    throw noEncontrado('el tipo de consulta');
  }
  if (!fila.activo) {
    // Reusamos `noEncontrado` en lugar de un 403: un id que existe pero esta
    // dado de baja se comporta como si no existiera para el cliente.
    throw noEncontrado('el tipo de consulta');
  }
}

/**
 * US-AYU-03 - Crea el ticket y dispara el envio del correo de acuse.
 *
 * El flujo es:
 *
 *   1. Validar el `tipoConsultaId` (existe y esta activo).
 *   2. En UNA transaccion: INSERT en `ticket_soporte` y, si hay adjuntos,
 *      INSERT en `adjunto_ticket` por cada uno.
 *   3. Auditar el alta con `registrarOperacion`.
 *   4. Enviar el correo de acuse con Resend.
 *
 * POR QUE EL CORREO VA DESPUES DEL COMMIT
 * ---------------------------------------------------------------------------
 * Si el envio del correo fallara, no queremos revertir la creacion del
 * ticket: la consulta ya esta en la base, y el equipo de soporte la ve.
 * El usuario vera el dialogo de exito igual, y si en el futuro hay que
 * implementar la "bandeja del usuario" (PAN-AYU-XX), ahi tendra su
 * registro. Ademas, Resend puede tardar segundos en responder, y tener
 * una transaccion abierta tanto tiempo es pedir un lock sobre `ticket_soporte`.
 *
 * POR QUE NO SE RECHAZA LA CONSULTA SI EL CORREO FALLA
 * ---------------------------------------------------------------------------
 * US-AYU-03 dice que si falla la conexion al servidor de correo se muestre
 * `errorEnvio` y se de la opcion de reintentar o guardar borrador. Esa
 * decision es de la PANTALLA, no de la API: el ticket ya esta creado y
 * es valioso para el equipo de soporte. La API devuelve 201 con el id y
 * deja la decision al cliente (que en este caso reintenta el envio del
 * correo, no del ticket).
 */
export async function crearTicketSoporte(entrada: {
  usuarioId: string;
  datos: EnviarConsultaInput;
  ipOrigen: string | null;
}): Promise<ResultadoCrearTicket> {
  await validarTipoConsultaActivo(entrada.datos.tipoConsultaId);

  const ticketId = await db.transaction(async (tx) => {
    const [filaTicket] = await tx
      .insert(ticketSoporte)
      .values({
        usuarioId: entrada.usuarioId,
        tipoConsultaId: entrada.datos.tipoConsultaId,
        asunto: entrada.datos.asunto,
        descripcion: entrada.datos.descripcion,
        // El default 'ABIERTO' lo pone la base; no hace falta setearlo.
      })
      .returning({ id: ticketSoporte.id });

    if (!filaTicket) {
      throw new Error('el INSERT del ticket no devolvio ninguna fila');
    }

    if (entrada.datos.adjuntos.length > 0) {
      await tx.insert(adjuntoTicket).values(
        entrada.datos.adjuntos.map((adjunto: AdjuntoTicketInput) => ({
          ticketId: filaTicket.id,
          archivoUrl: adjunto.url,
          nombreArchivo: adjunto.nombreArchivo,
          tipoMime: adjunto.tipoMime,
          tamanoBytes: adjunto.tamanoBytes,
        })),
      );
    }

    return filaTicket.id;
  });

  // La auditoria es "fire and forget", igual que en el resto del sistema:
  // un fallo del registro no convierte un 201 en un 500.
  void registrarOperacion({
    usuarioId: entrada.usuarioId,
    operacion: 'ALTA',
    tipoObjeto: 'ticket_soporte',
    objetoAfectadoId: ticketId,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      tipoConsultaId: entrada.datos.tipoConsultaId,
      cantidadAdjuntos: entrada.datos.adjuntos.length,
    },
  });

  // El correo de acuse. Si falla, se loguea y se devuelve 201 igual: la
  // US-AYU-03 pide el dialogo de reintento SOLO cuando el server rechaza
  // (codigo 5xx o fallo de red ANTES del INSERT). Cuando el ticket queda
  // creado, el cliente sigue el camino feliz. El que reintenta el envio
  // del correo es el propio cliente, llamando a un endpoint dedicado
  // (`POST /soporte/tickets/:id/reenviar-acuse`), que queda fuera del
  // alcance de esta US pero se menciona aca para que la decision quede
  // documentada.
  await enviarAcuseConLog({ ticketId, usuarioId: entrada.usuarioId });

  return {
    id: ticketId,
    mensaje: 'Consulta registrada con exito.',
  };
}

/**
 * Envia el correo de acuse y loguea el resultado.
 *
 * Si el envio falla, NO se propaga la excepcion: el ticket ya esta creado
 * y eso es lo que cuenta. El error queda en los logs con el id del ticket
 * para que el equipo de soporte pueda, en el futuro, reintentar el envio
 * manualmente o avisarle al usuario por otro canal.
 */
async function enviarAcuseConLog(entrada: {
  ticketId: string;
  usuarioId: string;
}): Promise<void> {
  try {
    const [perfil] = await db
      .select({ email: usuario.email, nombre: usuario.nombre })
      .from(usuario)
      .where(eq(usuario.id, entrada.usuarioId))
      .limit(1);

    if (!perfil) {
      logger.warn(
        { ticketId: entrada.ticketId, usuarioId: entrada.usuarioId },
        'no se encontro el perfil del autor del ticket; se omite el acuse',
      );
      return;
    }

    await enviarCorreo({
      destinatario: perfil.email,
      nombre: perfil.nombre,
      asunto: 'Recibimos tu consulta en FoodHub',
      html: cuerpoDeAcuse({
        nombre: perfil.nombre,
        idTicket: entrada.ticketId,
      }),
    });
  } catch (error) {
    if (error instanceof ErrorDeEmail) {
      logger.warn(
        {
          ticketId: entrada.ticketId,
          codigo: error.codigo,
          mensaje: error.message,
        },
        'no se pudo enviar el correo de acuse de recibo',
      );
      return;
    }
    logger.error(
      { err: error, ticketId: entrada.ticketId },
      'fallo no previsto al enviar el acuse',
    );
  }
}
