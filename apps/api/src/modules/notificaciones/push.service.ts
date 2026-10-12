import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/**
 * Cliente de la Expo Push API (US-NOT-01 a US-NOT-06, punto 1.3.1.11).
 *
 * El envio real de FCM lo hace Expo: la API le manda a `exp.host` una lista de
 * mensajes con los Expo Push Tokens de los dispositivos y Expo se encarga del
 * resto. No se usa `expo-server-sdk` -una dependencia mas para lo que son dos
 * `fetch`- ; el contrato de la API es estable y esta documentado.
 *
 * Este modulo NO toca la base: recibe tokens y devuelve, por token, si el envio
 * salio o si el token esta muerto. Quien decide que hacer con eso (marcar la
 * notificacion, desactivar el dispositivo) es `despacho.service.ts`.
 */

const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

/** Expo acepta hasta 100 mensajes por request. */
const TOPE_MENSAJES_POR_REQUEST = 100;

export interface MensajePush {
  /** Expo Push Token del dispositivo destino. */
  to: string;
  titulo: string;
  cuerpo: string;
  /** Viaja en el push y lo lee el handler de la app para el deep link. */
  data: Record<string, string>;
}

/**
 * Resultado del envio a UN token.
 *
 *   ok               Expo acepto el mensaje.
 *   token_muerto     `DeviceNotRegistered`: el token ya no sirve (app
 *                    desinstalada, permiso revocado). Hay que desactivarlo.
 *   error            cualquier otro fallo (rate limit de Expo, mensaje mal
 *                    formado, red). Se reintenta en el proximo barrido.
 */
export type ResultadoPush = 'ok' | 'token_muerto' | 'error';

interface TicketExpo {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

function cabeceras(): Record<string, string> {
  const base: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  // Solo si el proyecto de Expo exige autenticacion ("Enhanced Security").
  if (env.EXPO_ACCESS_TOKEN) {
    base.authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
  }
  return base;
}

function aResultado(ticket: TicketExpo | undefined): ResultadoPush {
  if (!ticket) return 'error';
  if (ticket.status === 'ok') return 'ok';
  if (ticket.details?.error === 'DeviceNotRegistered') return 'token_muerto';
  return 'error';
}

/** Envia un lote (<= 100) y devuelve el resultado alineado con la entrada. */
async function enviarLote(mensajes: MensajePush[]): Promise<ResultadoPush[]> {
  const cuerpo = mensajes.map((m) => ({
    to: m.to,
    title: m.titulo,
    body: m.cuerpo,
    data: m.data,
    sound: 'default',
    // El canal 'default' lo crea la app al iniciar (Android exige un canal
    // para el aviso emergente). Ver `useRegistroDeDispositivo` en mobile.
    channelId: 'default',
  }));

  let respuesta: Response;
  try {
    respuesta = await fetch(URL_EXPO_PUSH, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify(cuerpo),
    });
  } catch (error) {
    // Sin conexion a exp.host: no es un fallo del token. Se reintenta.
    logger.warn({ err: error }, 'no se pudo contactar la Expo Push API');
    return mensajes.map(() => 'error');
  }

  if (!respuesta.ok) {
    logger.warn(
      { status: respuesta.status },
      'la Expo Push API respondio con error',
    );
    return mensajes.map(() => 'error');
  }

  const json = (await respuesta.json()) as { data?: TicketExpo[] };
  const tickets = json.data ?? [];
  return mensajes.map((_, i) => aResultado(tickets[i]));
}

/**
 * Envia todos los mensajes, troceando en lotes de 100. El resultado sale en el
 * mismo orden que la entrada.
 */
export async function enviarPush(
  mensajes: MensajePush[],
): Promise<ResultadoPush[]> {
  if (mensajes.length === 0) return [];

  const resultados: ResultadoPush[] = [];
  for (let i = 0; i < mensajes.length; i += TOPE_MENSAJES_POR_REQUEST) {
    const lote = mensajes.slice(i, i + TOPE_MENSAJES_POR_REQUEST);
    resultados.push(...(await enviarLote(lote)));
  }
  return resultados;
}
