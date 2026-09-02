import { historialEstadoPedido, itemPedido, pedido } from '@foodhub/db';
import { db } from '../../../lib/db.js';
import { siguienteNumeroPedido } from '../../../modules/pedidos/consultas.js';
import {
  INSTRUCCIONES_CLIENTE,
  MOTIVOS_RECHAZO_ESCRITOS,
} from '../datos/textos.js';
import type { Aleatorio } from '../lib/aleatorio.js';
import type {
  ContextoSeed,
  DesenlacePedido,
  PublicacionCreada,
  UsuarioCreado,
} from '../lib/contexto.js';
import { distanciaKm } from '../lib/geo.js';
import {
  acotar,
  enHorarioDeComida,
  fechaConSesgoReciente,
  FIN_VENTANA,
  INICIO_VENTANA,
  sumarDias,
} from '../lib/tiempo.js';
import { transicionesDe, type Transicion } from './06-transiciones.js';

/**
 * Paso 6 - Pedidos historicos y su linea de tiempo.
 *
 * TODOS LOS PEDIDOS ESTAN CERRADOS (decision del equipo): terminan en
 * COMPLETADO o en RECHAZADO. Ninguno queda en CREADO, ACEPTADO o LISTO, asi
 * que el job de expiracion automatica no tiene nada que tocar y las bandejas
 * de pendientes arrancan vacias a proposito.
 *
 * LOS CUATRO DESENLACES Y COMO SE DISTINGUEN
 *
 * `estado_pedido` no tiene "cancelado" ni "expirado": los tres tipos de
 * rechazo comparten el estado RECHAZADO y se separan por `origen_rechazo`.
 *
 *   COMPLETADO              -> estado COMPLETADO
 *   Rechazado por cocinero  -> RECHAZADO, origen COCINERO, con motivo
 *   Cancelado por cliente   -> RECHAZADO, origen CLIENTE,  con motivo
 *   Tiempo agotado          -> RECHAZADO, origen SISTEMA,  sin motivo
 *
 * CADA COCINERO TIENE SU PROPIA MEZCLA. `mezclaEstados` en datos/usuarios.ts
 * define que porcentaje de sus pedidos cae en cada desenlace: el que atiende
 * bien completa el 84 % y el irregular apenas el 61 %. Sin esa dispersion, el
 * ranking del panel y el dashboard ordenarian por ruido.
 */

export interface PlanPedido {
  cocinero: UsuarioCreado;
  cliente: UsuarioCreado;
  fechaCreacion: Date;
  desenlace: DesenlacePedido;
  items: { publicacion: PublicacionCreada; cantidad: number }[];
  instrucciones: string | null;
}

/**
 * Elige al cliente sesgando por cercania.
 *
 * El peso cae con la distancia (1 / (1 + km)): el cliente de la misma zona
 * pide varias veces mas seguido que el del otro extremo del Gran Mendoza, sin
 * que ninguno quede en cero. Que todos los pares cocinero-cliente aparezcan al
 * menos una vez es lo que despues habilita las conversaciones y las
 * calificaciones cruzadas.
 */
function elegirCliente(
  contexto: ContextoSeed,
  cocineroCreado: UsuarioCreado,
): UsuarioCreado {
  const origen = cocineroCreado.ubicacion;
  const pesos = contexto.clientes.map((cliente) => {
    if (!origen || !cliente.ubicacion) return 1;
    return 1 / (1 + distanciaKm(origen, cliente.ubicacion));
  });

  const total = pesos.reduce((suma, peso) => suma + peso, 0);
  let umbral = contexto.azar.flotante() * total;
  for (const [indice, peso] of pesos.entries()) {
    umbral -= peso;
    if (umbral <= 0) return contexto.clientes[indice] as UsuarioCreado;
  }
  return contexto.clientes[contexto.clientes.length - 1] as UsuarioCreado;
}

/**
 * Fecha del pedido, nunca anterior a que las dos partes existan.
 *
 * El piso es el mas tardio entre el inicio de la ventana, los catorce dias
 * posteriores al alta del cocinero (que ya publico sus platos: el paso 5 los
 * crea dentro de los diez) y los tres dias posteriores al alta del cliente.
 */
function fechaDelPedido(entrada: {
  azar: Aleatorio;
  cocineroCreado: UsuarioCreado;
  cliente: UsuarioCreado;
}): Date {
  const piso = new Date(
    Math.max(
      INICIO_VENTANA.getTime(),
      sumarDias(entrada.cocineroCreado.fechaRegistro, 14).getTime(),
      sumarDias(entrada.cliente.fechaRegistro, 3).getTime(),
    ),
  );

  // `enHorarioDeComida` mueve la hora del dia y puede empujar la fecha fuera
  // del rango; se recorta despues para que ningun pedido caiga antes de que
  // sus dos partes existan ni despues del cierre de la ventana.
  const conHora = enHorarioDeComida(
    fechaConSesgoReciente(entrada.azar, piso, FIN_VENTANA),
    entrada.azar,
  );
  return acotar(conHora, piso, FIN_VENTANA);
}

/** La mayoria de los pedidos son de un solo plato; unos pocos, de tres. */
function cuantosSegunPesos(
  azar: Aleatorio,
  pesos: Record<'1' | '2' | '3', number>,
): number {
  return Number(azar.pesado(pesos));
}

function elegirItems(
  azar: Aleatorio,
  disponibles: PublicacionCreada[],
  fecha: Date,
): { publicacion: PublicacionCreada; cantidad: number }[] {
  // Solo se puede pedir lo que ya estaba publicado ese dia.
  const vigentes = disponibles.filter((p) => p.fechaCreacion <= fecha);
  const fuente = vigentes.length > 0 ? vigentes : disponibles;

  const cuantos = Math.min(
    fuente.length,
    cuantosSegunPesos(azar, { '1': 55, '2': 30, '3': 15 }),
  );

  return azar.elegirVarios(fuente, cuantos).map((publicacion) => ({
    publicacion,
    cantidad: cuantosSegunPesos(azar, { '1': 60, '2': 28, '3': 12 }),
  }));
}

function planificarPedidosDe(
  contexto: ContextoSeed,
  cocineroCreado: UsuarioCreado,
): PlanPedido[] {
  const { azar } = contexto;
  const mezcla = cocineroCreado.mezclaEstados;
  const cuantos = cocineroCreado.pedidos ?? 0;
  if (!mezcla || cuantos === 0) return [];

  const publicacionesDelCocinero = contexto.publicaciones.filter(
    (p) => p.cocineroId === cocineroCreado.id,
  );
  if (publicacionesDelCocinero.length === 0) return [];

  const planes: PlanPedido[] = [];
  for (let i = 0; i < cuantos; i += 1) {
    const cliente = elegirCliente(contexto, cocineroCreado);
    const fechaCreacion = fechaDelPedido({ azar, cocineroCreado, cliente });

    planes.push({
      cocinero: cocineroCreado,
      cliente,
      fechaCreacion,
      desenlace: azar.pesado({
        COMPLETADO: mezcla.completado,
        RECHAZADO_POR_COCINERO: mezcla.rechazadoPorCocinero,
        CANCELADO_POR_CLIENTE: mezcla.canceladoPorCliente,
        TIEMPO_AGOTADO: mezcla.tiempoAgotado,
      }) as DesenlacePedido,
      items: elegirItems(azar, publicacionesDelCocinero, fechaCreacion),
      instrucciones: azar.probabilidad(0.4)
        ? azar.elegir(INSTRUCCIONES_CLIENTE)
        : null,
    });
  }
  return planes;
}

/** Motivo con el que se cierra un pedido rechazado o cancelado. */
export interface MotivoDeCierre {
  motivoCancelacionId: string | null;
  motivoTexto: string | null;
}

function motivoDeCierre(
  contexto: ContextoSeed,
  desenlace: DesenlacePedido,
): MotivoDeCierre {
  const { azar } = contexto;
  if (desenlace === 'TIEMPO_AGOTADO' || desenlace === 'COMPLETADO') {
    return { motivoCancelacionId: null, motivoTexto: null };
  }

  const rol = desenlace === 'RECHAZADO_POR_COCINERO' ? 'COCINERO' : 'CLIENTE';
  const aplicables = contexto.motivosCancelacion.filter(
    (motivo) =>
      motivo.activo &&
      (motivo.aplicableA === rol || motivo.aplicableA === 'AMBOS'),
  );

  // El cocinero puede rechazar con texto libre en vez de elegir del catalogo
  // (US-PED-04); el cliente cancela "con o sin motivo" (US-PED-09).
  if (rol === 'COCINERO' && azar.probabilidad(0.35)) {
    return {
      motivoCancelacionId: null,
      motivoTexto: azar.elegir(MOTIVOS_RECHAZO_ESCRITOS),
    };
  }
  if (rol === 'CLIENTE' && azar.probabilidad(0.2)) {
    return { motivoCancelacionId: null, motivoTexto: null };
  }

  const elegido = azar.elegir(aplicables);
  return { motivoCancelacionId: elegido.id, motivoTexto: null };
}

interface PedidoArmado {
  plan: PlanPedido;
  motivo: MotivoDeCierre;
  transiciones: Transicion[];
  total: number;
}

function armar(contexto: ContextoSeed, plan: PlanPedido): PedidoArmado {
  const motivo = motivoDeCierre(contexto, plan.desenlace);
  const transiciones = transicionesDe({
    azar: contexto.azar,
    plan,
    motivo,
    nombreMotivo:
      contexto.motivosCancelacion.find(
        (m) => m.id === motivo.motivoCancelacionId,
      )?.nombre ?? null,
  });
  const total = plan.items.reduce(
    (suma, item) => suma + item.cantidad * item.publicacion.precio,
    0,
  );
  return { plan, motivo, transiciones, total };
}

function filaDePedido(armado: PedidoArmado) {
  const { plan, motivo, transiciones } = armado;
  const ultima = transiciones[transiciones.length - 1] as Transicion;
  const aceptacion = transiciones.find((t) => t.estado === 'ACEPTADO');
  const completado = plan.desenlace === 'COMPLETADO';

  return {
    numeroPedido: siguienteNumeroPedido,
    clientePedidoId: plan.cliente.id,
    cocineroPedidoId: plan.cocinero.id,
    estadoPedidoActual: ultima.estado,
    instruccionesCliente: plan.instrucciones,
    tiempoEstimadoPreparacionMin: aceptacion?.tiempoEstimadoMin ?? null,
    tiempoFinalPreparacionMin: completado
      ? (ultima.minutosDesdeAceptacion ?? null)
      : null,
    origenRechazo: completado ? null : ultima.origen,
    motivoRechazo: motivo.motivoTexto,
    usuarioOrigenRechazoId: completado ? null : (ultima.responsableId ?? null),
    motivoCancelacionId: motivo.motivoCancelacionId,
    fechaCreacion: plan.fechaCreacion,
    fechaUltimaTransicion: ultima.fecha,
  };
}

const TAMANO_LOTE = 100;

async function insertarLote(
  contexto: ContextoSeed,
  lote: PedidoArmado[],
): Promise<void> {
  const filas = await db
    .insert(pedido)
    .values(lote.map(filaDePedido))
    .returning({ id: pedido.id, numeroPedido: pedido.numeroPedido });

  const items = [];
  const historial = [];

  for (const [indice, armado] of lote.entries()) {
    const fila = filas[indice];
    if (!fila)
      throw new Error(
        'el insert de pedidos devolvió menos filas de las esperadas',
      );

    for (const item of armado.plan.items) {
      items.push({
        pedidoId: fila.id,
        publicacionId: item.publicacion.id,
        cantidad: item.cantidad,
        precioUnitarioSnapshot: item.publicacion.precio.toFixed(2),
        nombrePlatoSnapshot: item.publicacion.plato.nombre,
        imagenSnapshot: item.publicacion.imagenUrl,
      });
    }

    for (const transicion of armado.transiciones) {
      historial.push({
        pedidoId: fila.id,
        estadoPedidoAnterior: transicion.estadoAnterior,
        estadoPedidoActual: transicion.estado,
        origenTransicion: transicion.origen,
        usuarioResponsableId: transicion.responsableId,
        motivo: transicion.motivo,
        fechaTransicion: transicion.fecha,
      });
    }

    const ultima = armado.transiciones[
      armado.transiciones.length - 1
    ] as Transicion;
    contexto.pedidos.push({
      id: fila.id,
      numeroPedido: fila.numeroPedido,
      clienteId: armado.plan.cliente.id,
      clienteSlug: armado.plan.cliente.slug,
      cocineroId: armado.plan.cocinero.id,
      cocineroSlug: armado.plan.cocinero.slug,
      estado: ultima.estado,
      desenlace: armado.plan.desenlace,
      origenRechazo:
        armado.plan.desenlace === 'COMPLETADO' ? null : ultima.origen,
      items: armado.plan.items.map((item) => ({
        publicacionId: item.publicacion.id,
        publicacion: item.publicacion,
        cantidad: item.cantidad,
        precioUnitario: item.publicacion.precio,
      })),
      total: armado.total,
      fechaCreacion: armado.plan.fechaCreacion,
      fechaUltimaTransicion: ultima.fecha,
    });
  }

  await db.insert(itemPedido).values(items);
  await db.insert(historialEstadoPedido).values(historial);
}

export async function sembrarPedidos(contexto: ContextoSeed): Promise<void> {
  const planes = contexto.cocineros
    .flatMap((cocineroCreado) => planificarPedidosDe(contexto, cocineroCreado))
    .filter((plan) => plan.items.length > 0);

  // Se ordenan por fecha ANTES de insertar para que la secuencia
  // `pedido_numero_seq` reparta los numeros en orden cronologico: FH-00001 es
  // el pedido mas viejo del dataset, como en una plataforma real.
  planes.sort((a, b) => a.fechaCreacion.getTime() - b.fechaCreacion.getTime());

  const armados = planes.map((plan) => armar(contexto, plan));
  for (let i = 0; i < armados.length; i += TAMANO_LOTE) {
    await insertarLote(contexto, armados.slice(i, i + TAMANO_LOTE));
  }
}
