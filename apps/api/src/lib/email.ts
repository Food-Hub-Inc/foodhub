import { Resend } from 'resend';
import { env, esProduccion } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Wrapper del SDK de Resend para el correo de acuse de recibo de una consulta
 * al soporte (US-AYU-03).
 *
 * POR QUE ESTE WRAPPER Y NO LLAMAR A RESEND DIRECTAMENTE
 * ---------------------------------------------------------------------------
 * Quien envia el correo es `soporte.service.ts`, pero la logica de "que hacer
 * cuando falta la API key" no le corresponde: el servicio quiere un
 * `Result<{ id }, Error>` y nada mas. Aislar el cliente aqui permite:
 *
 *   - mockear el envio en pruebas con un solo cambio de import;
 *   - decidir en un solo lugar si loguear o fallar cuando falta la key;
 *   - definir un tipo de error propio (`ErrorDeEmail`) que el servicio puede
 *     distinguir de cualquier otra excepcion.
 *
 * POR QUE FALTA LA KEY EN DESARROLLO ES INFORMATIVO, NO UN ERROR
 * ---------------------------------------------------------------------------
 * Levantar la API sin una cuenta en Resend no tiene que bloquear al resto de
 * los modulos. Si la key falta:
 *
 *   - en dev/test: se loguea con `info` y se devuelve exito. El ticket se
 *     crea y el usuario ve el dialogo de exito igual; el correo no llega
 *     pero el caso se descubre en los logs.
 *   - en produccion: `env.ts` rechaza arrancar si `RESEND_API_KEY` esta
 *     vacia (validacion obligatoria explicita, no este wrapper).
 *
 * Por eso este modulo NO chequea `esProduccion` para decidir entre loguear
 * o fallar: ese control lo hace `env.ts` antes de que el servidor arranque.
 */

export interface ResultadoEnvio {
  readonly id: string;
}

/**
 * Error propio de envio. Distingue un fallo de Resend de un error
 * desconocido para que el caller decida si reintentar o no.
 */
export class ErrorDeEmail extends Error {
  constructor(
    mensaje: string,
    readonly codigo: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDeEmail';
  }
}

export interface DatosCorreo {
  readonly destinatario: string;
  readonly asunto: string;
  readonly html: string;
  /** Nombre del destinatario, opcional. */
  readonly nombre?: string;
}

/**
 * Cliente de Resend cacheado a nivel de modulo.
 *
 * Construir `new Resend(...)` por cada envio es barato pero innecesario: la
 * SDK es idempotente y la API key no cambia. Si el dia de manana hace falta
 * un cliente por ambiente o por dominio de envio, esta es la unica linea
 * que hay que tocar.
 */
let cliente: Resend | null = null;

function obtenerCliente(): Resend | null {
  if (cliente !== null) return cliente;
  if (!env.RESEND_API_KEY) return null;
  cliente = new Resend(env.RESEND_API_KEY);
  return cliente;
}

/**
 * Envia un correo transaccional.
 *
 * Devuelve `Promise<ResultadoEnvio>` con el id del correo en Resend. Si la
 * SDK falla, lanza `ErrorDeEmail` con un codigo que el caller puede
 * inspeccionar (`AUTHENTICATION_FAILED`, `RATE_LIMITED`, `UNKNOWN`).
 */
export async function enviarCorreo(
  datos: DatosCorreo,
): Promise<ResultadoEnvio> {
  const sdk = obtenerCliente();
  if (sdk === null) {
    /**
     * Estamos en dev sin `RESEND_API_KEY`. Logueamos lo suficiente para que
     * la persona que prueba la pantalla pueda confirmar que el flujo llego
     * hasta aca, pero NO devolvemos un id real: si la pantalla lo mostrara,
     * podria confundir con un envio verdadero.
     */
    logger.info(
      {
        destinatario: datos.destinatario,
        asunto: datos.asunto,
        longitudHtml: datos.html.length,
      },
      'envio de correo simulado (sin RESEND_API_KEY)',
    );
    return { id: 'simulado' };
  }

  try {
    const { data, error } = await sdk.emails.send({
      from: env.RESEND_REMITENTE,
      to: datos.destinatario,
      subject: datos.asunto,
      html: datos.html,
      ...(datos.nombre ? { name: datos.nombre } : {}),
    });

    if (error) {
      /**
       * Resend devuelve un objeto `error` tipado con `name` y `message`.
       * Mapeamos los nombres conocidos a codigos estables; el resto cae a
       * `UNKNOWN` y se loguea con detalle para investigar despues.
       */
      const codigo = mapearCodigoDeError(error.name);
      logger.error(
        { err: error, destinatario: datos.destinatario, codigo },
        'Resend rechazo el envio del correo',
      );
      throw new ErrorDeEmail(
        error.message ?? 'Error desconocido de Resend',
        codigo,
      );
    }

    if (!data?.id) {
      throw new ErrorDeEmail(
        'Resend respondio sin identificador de envio',
        'UNKNOWN',
      );
    }

    logger.info(
      { id: data.id, destinatario: datos.destinatario },
      'correo enviado',
    );
    return { id: data.id };
  } catch (error) {
    /**
     * Si ya es un `ErrorDeEmail` (los casos mapeados arriba), lo re-lanzamos
     * tal cual. Cualquier otra excepcion (red, timeout, JSON malformado) la
     * envolvemos con codigo `UNKNOWN`.
     */
    if (error instanceof ErrorDeEmail) throw error;
    logger.error(
      { err: error, destinatario: datos.destinatario },
      'fallo no previsto al enviar el correo',
    );
    throw new ErrorDeEmail(
      error instanceof Error ? error.message : 'Error desconocido',
      'UNKNOWN',
    );
  }
}

/**
 * Traduce el `name` de un error de Resend a un codigo de tres letras que el
 * caller puede discriminar.
 *
 * La lista es corta a proposito: solo los errores que el servicio de soporte
 * necesita distinguir (autenticacion y rate limit). El resto cae a `UNKNOWN`
 * y se loguea para investigar.
 */
function mapearCodigoDeError(nombre: string | undefined): string {
  switch (nombre) {
    case 'validation_error':
      return 'VALIDATION';
    case 'authentication_failed':
    case 'invalid_api_key':
      return 'AUTHENTICATION_FAILED';
    case 'rate_limit_exceeded':
      return 'RATE_LIMITED';
    default:
      return esProduccion ? 'UNKNOWN' : `UNKNOWN:${nombre ?? 'sin-nombre'}`;
  }
}
