import { dispositivoPush, notificacion } from '@foodhub/db';
import type { TipoNotificacion } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import type { ContextoSeed, PedidoCreado } from '../lib/contexto.js';
import { diasEntre, FIN_VENTANA, sumarMinutos } from '../lib/tiempo.js';

/**
 * Paso 12 - Notificaciones in-app y dispositivos push.
 *
 * `notificacion` es el HISTORIAL de lo que se le aviso a cada usuario; el push
 * por FCM es un efecto adicional que puede fallar sin que la fila deje de
 * escribirse. Por eso la seed llena la tabla aunque no exista ningun telefono
 * real escuchando.
 *
 * SOLO SE NOTIFICAN LOS ULTIMOS 60 DIAS. La campana de la app muestra lo
 * reciente, y escribir una notificacion por cada transicion de los 750 pedidos
 * llenaria la tabla con miles de filas que ninguna pantalla va a abrir. El
 * corte deja el historial en un tamano que se puede recorrer a mano.
 *
 * LO NO LEIDO SE CONCENTRA EN LO NUEVO: lo de hace un mes ya se leyo, lo de
 * los ultimos dias no siempre. Sin ese sesgo el contador de la campana muestra
 * un numero que no se corresponde con lo que el usuario ve al abrirla.
 */

const DIAS_DE_HISTORIAL = 60;

interface AvisoPlanificado {
  usuarioDestinoId: string;
  tipoNotificacion: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  objetoAfectadoId: string;
  fechaCreacion: Date;
}

function avisosDelPedido(ped: PedidoCreado): AvisoPlanificado[] {
  const base = { objetoAfectadoId: ped.id };

  const alCocinero: AvisoPlanificado = {
    ...base,
    usuarioDestinoId: ped.cocineroId,
    tipoNotificacion: 'PEDIDO_CREADO',
    titulo: 'Tenés un pedido nuevo',
    cuerpo: `El pedido ${ped.numeroPedido} está esperando tu respuesta.`,
    fechaCreacion: ped.fechaCreacion,
  };

  if (ped.desenlace === 'COMPLETADO') {
    return [
      alCocinero,
      {
        ...base,
        usuarioDestinoId: ped.clienteId,
        tipoNotificacion: 'PEDIDO_ACEPTADO',
        titulo: 'Tu pedido fue aceptado',
        cuerpo: `${ped.numeroPedido} ya está en preparación.`,
        fechaCreacion: sumarMinutos(ped.fechaCreacion, 8),
      },
      {
        ...base,
        usuarioDestinoId: ped.clienteId,
        tipoNotificacion: 'PEDIDO_LISTO',
        titulo: 'Tu pedido está listo',
        cuerpo: `Ya podés pasar a retirar ${ped.numeroPedido}.`,
        fechaCreacion: sumarMinutos(ped.fechaUltimaTransicion, -20),
      },
      {
        ...base,
        usuarioDestinoId: ped.clienteId,
        tipoNotificacion: 'PEDIDO_COMPLETADO',
        titulo: 'Pedido entregado',
        cuerpo: `${ped.numeroPedido} se marcó como completado. ¿Nos contás cómo estuvo?`,
        fechaCreacion: ped.fechaUltimaTransicion,
      },
    ];
  }

  // Los tres rechazos avisan al cliente; el de tiempo agotado avisa tambien al
  // cocinero, que es quien dejo vencer el pedido sin responder.
  const rechazo: AvisoPlanificado = {
    ...base,
    usuarioDestinoId: ped.clienteId,
    tipoNotificacion: 'PEDIDO_RECHAZADO',
    titulo:
      ped.desenlace === 'TIEMPO_AGOTADO'
        ? 'Tu pedido venció sin respuesta'
        : 'Tu pedido fue rechazado',
    cuerpo: `${ped.numeroPedido} no se concretó. Mirá el detalle para ver el motivo.`,
    fechaCreacion: ped.fechaUltimaTransicion,
  };

  if (ped.desenlace === 'CANCELADO_POR_CLIENTE') {
    return [
      alCocinero,
      {
        ...rechazo,
        usuarioDestinoId: ped.cocineroId,
        titulo: 'El cliente canceló el pedido',
        cuerpo: `${ped.numeroPedido} se canceló antes de que lo aceptaras.`,
      },
    ];
  }

  if (ped.desenlace === 'TIEMPO_AGOTADO') {
    return [
      alCocinero,
      rechazo,
      {
        ...rechazo,
        usuarioDestinoId: ped.cocineroId,
        titulo: 'Se te venció un pedido',
        cuerpo: `${ped.numeroPedido} expiró sin respuesta y pasó a rechazado.`,
      },
    ];
  }

  return [alCocinero, rechazo];
}

function avisosDeResenas(
  contexto: ContextoSeed,
  desde: Date,
): AvisoPlanificado[] {
  return contexto.resenas
    .filter((r) => r.fechaPublicacion >= desde)
    .map((r) => ({
      usuarioDestinoId: r.cocineroId,
      tipoNotificacion: 'RESENA_RECIBIDA' as const,
      titulo: 'Recibiste una reseña nueva',
      cuerpo: `Un cliente calificó uno de tus platos con ${String(r.calificacion)} estrellas.`,
      objetoAfectadoId: r.publicacionId,
      fechaCreacion: r.fechaPublicacion,
    }));
}

function avisosDeMensajes(
  contexto: ContextoSeed,
  desde: Date,
): AvisoPlanificado[] {
  return contexto.conversaciones
    .filter((c) => c.ultimoMensaje >= desde)
    .map((c) => ({
      usuarioDestinoId: contexto.azar.probabilidad(0.5)
        ? c.cocineroId
        : c.clienteId,
      tipoNotificacion: 'MENSAJE_NUEVO' as const,
      titulo: 'Tenés un mensaje nuevo',
      cuerpo: 'Abrí la conversación para responder.',
      objetoAfectadoId: c.id,
      fechaCreacion: c.ultimoMensaje,
    }));
}

/**
 * Aviso general del administrador a toda la plataforma. Es del tipo
 * AVISO_SISTEMA, que `preferenciasIniciales` marca como no modificable: el
 * usuario no lo puede apagar (RF059).
 */
function avisoDeSistema(contexto: ContextoSeed): AvisoPlanificado[] {
  const fecha = new Date(FIN_VENTANA.getTime() - 6 * 24 * 60 * 60 * 1000);
  return [...contexto.usuarios.values()]
    .filter((u) => u.tipo !== 'ADMINISTRADOR')
    .map((u) => ({
      usuarioDestinoId: u.id,
      tipoNotificacion: 'AVISO_SISTEMA' as const,
      titulo: 'Actualizamos los términos y condiciones',
      cuerpo:
        'Publicamos una versión nueva de los términos. Podés leerla desde Ayuda → Información legal.',
      objetoAfectadoId: contexto.versionTerminosVigenteId,
      fechaCreacion: fecha,
    }));
}

async function sembrarAvisos(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const desde = new Date(
    FIN_VENTANA.getTime() - DIAS_DE_HISTORIAL * 24 * 60 * 60 * 1000,
  );

  const planificados = [
    ...contexto.pedidos
      .filter((ped) => ped.fechaCreacion >= desde)
      .flatMap(avisosDelPedido),
    ...avisosDeResenas(contexto, desde),
    ...avisosDeMensajes(contexto, desde),
    ...avisoDeSistema(contexto),
  ];

  const filas = planificados.map((aviso) => {
    // Cuanto mas reciente, mas chance de seguir sin leer.
    const antiguedad = diasEntre(aviso.fechaCreacion, FIN_VENTANA);
    const chanceSinLeer = antiguedad <= 2 ? 0.6 : antiguedad <= 7 ? 0.25 : 0.05;
    return {
      ...aviso,
      leida: !azar.probabilidad(chanceSinLeer),
      // Historicas: el push ya se "envio". Sin esto quedarian 'PENDIENTE' y el
      // despachador, al levantar la API contra una base sembrada, intentaria
      // pushear cientos de filas contra los Expo Push Tokens falsos de la seed.
      pushEstado: 'ENVIADO' as const,
    };
  });

  for (let i = 0; i < filas.length; i += 300) {
    await db.insert(notificacion).values(filas.slice(i, i + 300));
  }
}

/**
 * Un dispositivo por cliente y por cocinero.
 *
 * LOS TOKENS SON FALSOS Y NO SIRVEN PARA ENVIAR. Tienen el formato de un Expo
 * Push Token para que la columna sea representativa, pero Expo los va a
 * rechazar con `DeviceNotRegistered`. Es lo esperado: el envio real necesita
 * que la app registre el token del telefono al iniciar sesion, y eso no lo
 * puede simular un script. La fila existe para que el panel y las consultas
 * tengan que resolver.
 */
async function sembrarDispositivos(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const conApp = [...contexto.cocineros, ...contexto.clientes];

  await db.insert(dispositivoPush).values(
    conApp.map((u) => ({
      usuarioId: u.id,
      expoPushToken: `ExponentPushToken[seed-${u.slug}]`,
      plataforma: 'android',
      dispositivoInfo: azar.elegir([
        'Samsung Galaxy A54 - Android 14',
        'Motorola Moto G84 - Android 14',
        'Xiaomi Redmi Note 13 - Android 13',
        'Samsung Galaxy S23 - Android 15',
      ]),
      activo: true,
      fechaRegistro: u.fechaRegistro,
      fechaUltimoUso: FIN_VENTANA,
    })),
  );
}

export async function sembrarNotificaciones(
  contexto: ContextoSeed,
): Promise<void> {
  await sembrarAvisos(contexto);
  await sembrarDispositivos(contexto);
}
