import { z } from 'zod';
import { MENSAJES_DASHBOARD } from '../constants/mensajes.js';
import { categoriaResumenSchema } from './catalogo.schema.js';

/**
 * Contratos del modulo de Dashboard del cocinero (US-DASH-01 a US-DASH-05,
 * RF042 a RF046). Pantalla: PAN-DASH-01, "Mi actividad".
 *
 * TRES DECISIONES QUE ATRAVIESAN TODO EL MODULO
 *
 *   EL PERIODO ES UNO SOLO   US-DASH-05 no es una metrica mas: es un parametro
 *       de las otras cuatro. Se resuelve una vez a nivel de pantalla y viaja en
 *       un unico request, de modo que las cuatro secciones no puedan quedar
 *       mostrando rangos distintos entre si.
 *
 *   EL RANGO LO CALCULA EL CLIENTE   "Este mes" es el mes del reloj del
 *       cocinero, y el servidor no conoce su zona horaria. El cliente traduce la
 *       opcion elegida a un rango concreto con `rangoDePeriodo` y manda las dos
 *       fechas en UTC; el servidor solo verifica que sean coherentes entre si.
 *
 *   UN PEDIDO PERTENECE AL PERIODO EN QUE SE CREO   La pertenencia se decide por
 *       `pedido.fecha_creacion` en las cuatro secciones (decision del equipo del
 *       20/08/2026). Usar la fecha de cierre haria que un pedido cambiara de
 *       periodo solo, al completarse, y que dos secciones de la misma pantalla
 *       contaran universos distintos.
 */

// ---------------------------------------------------------------------------
// Reglas del dominio
// ---------------------------------------------------------------------------

/**
 * Opciones del selector de periodo (US-DASH-05).
 *
 * "Muestre las siguientes opciones predefinidas: 'Esta semana', 'Este mes',
 * 'Ultimos 3 meses', 'Este ano' y 'Personalizado'."
 *
 * No es un enum de la base: el periodo no se persiste en ningun lado, vive en
 * el estado de la pantalla. Mismo criterio que `PESTANA_PEDIDOS_COCINERO`.
 */
export const PERIODO_DASHBOARD = [
  'SEMANA',
  'MES',
  'TRIMESTRE',
  'ANIO',
  'PERSONALIZADO',
] as const;
export type PeriodoDashboard = (typeof PERIODO_DASHBOARD)[number];

/** Los cuatro que se calculan solos. "Personalizado" lo escribe el cocinero. */
export type PeriodoPredefinido = Exclude<PeriodoDashboard, 'PERSONALIZADO'>;

/** US-DASH-05: "El periodo 'Este mes' se aplica por defecto". */
export const PERIODO_POR_DEFECTO: PeriodoPredefinido = 'MES';

/** Medianoche del dia de `fecha`, en la zona horaria local. */
function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/**
 * `fecha` menos `meses`, con el dia recortado al ultimo del mes destino.
 *
 * Sin el recorte, el 31 de mayo menos tres meses da "31 de febrero", que
 * JavaScript desborda al 3 de marzo: el rango de "Ultimos 3 meses" empezaria
 * tres dias tarde una vez cada tanto.
 */
function haceMeses(fecha: Date, meses: number): Date {
  const destino = new Date(fecha.getFullYear(), fecha.getMonth() - meses, 1);
  const ultimoDia = new Date(
    destino.getFullYear(),
    destino.getMonth() + 1,
    0,
  ).getDate();
  destino.setDate(Math.min(fecha.getDate(), ultimoDia));
  return destino;
}

/**
 * Rango concreto de una opcion predefinida (US-DASH-05). Funcion PURA salvo por
 * el reloj, que se inyecta para poder probarla.
 *
 * LOS CUATRO RANGOS TERMINAN AHORA, no al final del periodo calendario. Lo fija
 * el ejemplo del propio criterio: estando a 13 de mayo, "Este mes" se indica
 * como "1 may - 13 may" y no como "1 may - 31 may".
 *
 * La semana arranca el LUNES: es la convencion de es-AR, el unico locale del
 * sistema (`usuario.idioma_preferido` por defecto). "Ultimos 3 meses" es una
 * ventana movil y no el trimestre calendario, porque el rotulo dice "ultimos" y
 * no "este".
 */
export function rangoDePeriodo(
  periodo: PeriodoPredefinido,
  ahora: Date = new Date(),
): { desde: Date; hasta: Date } {
  const hoy = inicioDelDia(ahora);

  switch (periodo) {
    case 'SEMANA': {
      // getDay(): 0 es domingo. Se corre para que el lunes sea el dia 0.
      const diasDesdeElLunes = (ahora.getDay() + 6) % 7;
      const desde = new Date(hoy);
      desde.setDate(hoy.getDate() - diasDesdeElLunes);
      return { desde, hasta: ahora };
    }
    case 'MES':
      return {
        desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1),
        hasta: ahora,
      };
    case 'TRIMESTRE':
      return { desde: haceMeses(hoy, 3), hasta: ahora };
    case 'ANIO':
      return { desde: new Date(ahora.getFullYear(), 0, 1), hasta: ahora };
  }
}

/**
 * Los cuatro estados de US-DASH-04, en el orden en que los enumera el criterio.
 *
 * Son cuatro rotulos para DOS estados internos: COMPLETADO, y RECHAZADO abierto
 * por `origen_rechazo` (el cocinero rechazo, el cliente cancelo -US-PED-09- o
 * expiro solo -US-PED-10-).
 */
export const ESTADOS_DISTRIBUCION = [
  'completados',
  'rechazadosCocinero',
  'canceladosCliente',
  'expirados',
] as const;
export type EstadoDistribucion = (typeof ESTADOS_DISTRIBUCION)[number];

/**
 * Porcentaje de cada estado sobre el total del grafico. Funcion PURA.
 *
 * REPARTO POR RESTO MAYOR, no redondeo independiente. Tres estados con un tercio
 * cada uno, redondeados por separado, dan 33 + 33 + 33 = 99; y el criterio pide
 * que un unico estado presente "un unico segmento representando el 100%", asi
 * que el grafico y su listado tienen que cerrar. El sobrante se reparte entre
 * los estados de mayor parte fraccionaria, desempatando por el orden del
 * criterio.
 *
 * Con el total en cero devuelve todo en cero: esa es la rama del estado vacio,
 * donde el grafico ni siquiera se dibuja.
 */
export function porcentajesDeDistribucion(
  distribucion: DistribucionPedidos,
): Record<EstadoDistribucion, number> {
  const porcentajes: Record<EstadoDistribucion, number> = {
    completados: 0,
    rechazadosCocinero: 0,
    canceladosCliente: 0,
    expirados: 0,
  };
  if (distribucion.total <= 0) return porcentajes;

  const exactos = ESTADOS_DISTRIBUCION.map((estado) => ({
    estado,
    valor: (distribucion[estado] * 100) / distribucion.total,
  }));

  for (const { estado, valor } of exactos)
    porcentajes[estado] = Math.floor(valor);

  let sobrante =
    100 -
    ESTADOS_DISTRIBUCION.reduce(
      (suma, estado) => suma + porcentajes[estado],
      0,
    );

  const porResto = [...exactos].sort((a, b) => (b.valor % 1) - (a.valor % 1));
  for (const { estado } of porResto) {
    if (sobrante <= 0) break;
    porcentajes[estado] += 1;
    sobrante -= 1;
  }

  return porcentajes;
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

/**
 * Rango sobre el que se calculan las cuatro secciones (US-DASH-05).
 *
 * NO SE VALIDA QUE `hasta` NO SEA FUTURO, aunque el criterio diga que "la fecha
 * 'Hasta' no puede ser posterior a la fecha actual". El modo "Personalizado"
 * toma el fin del dia LOCAL del cocinero, que respecto del reloj del servidor es
 * futuro durante casi todo el dia: validarlo aca rechazaria rangos legitimos. La
 * restriccion se cumple por prevencion en la interfaz, que no deja elegir un dia
 * posterior a hoy.
 *
 * Las dos fechas llegan en UTC (`z.iso.datetime()` no admite offset), asi que
 * compararlas como texto ordena igual que compararlas como instantes.
 */
export const rangoDashboardSchema = z
  .object({
    desde: z.iso.datetime(),
    hasta: z.iso.datetime(),
  })
  .refine((rango) => rango.desde <= rango.hasta, {
    message: MENSAJES_DASHBOARD.rangoInvertido,
    path: ['desde'],
  });

// ---------------------------------------------------------------------------
// Respuesta
// ---------------------------------------------------------------------------

/**
 * US-DASH-01 - Las tres tarjetas de resumen.
 *
 * `ventasAcumuladas` es un `string` como todos los importes del sistema: la
 * columna es `numeric(12,2)` y convertirla a `number` reintroduce el error de
 * punto flotante que esa eleccion evita.
 *
 * `valoracionPromedio` es NULLABLE y no cero. Sin resenas en el periodo la
 * tarjeta muestra "Sin calificaciones aun", que no es lo mismo que una
 * valoracion de cero; misma regla que `aValoracion` en la API.
 */
export const resumenActividadSchema = z.object({
  ventasAcumuladas: z.string(),
  pedidosTotales: z.number().int().min(0),
  valoracionPromedio: z.number().nullable(),
  cantidadResenas: z.number().int().min(0),
});

/**
 * US-DASH-02 - Una fila del ranking de platos.
 *
 * `vecesPedido` cuenta UNIDADES vendidas (`sum(item_pedido.cantidad)`) y no
 * pedidos: un pedido de tres empanadas dice mas de la popularidad del plato que
 * uno de una sola (decision del equipo del 20/08/2026).
 *
 * `nombre`, `categoria`, `imagenUrl` y `precioActual` salen de la publicacion
 * VIGENTE y no de los snapshots de `item_pedido`: el criterio pide "precio
 * actual" explicitamente, y mezclar el nombre congelado con el precio de hoy
 * mostraria dos versiones del mismo plato en la misma fila.
 *
 * `eliminado` refleja la baja logica de la publicacion. La fila sigue en el
 * ranking con la indicacion "(eliminado)": sacarla cambiaria las metricas de un
 * periodo ya cerrado.
 */
export const platoMasPedidoSchema = z.object({
  publicacionId: z.uuid(),
  nombre: z.string(),
  categoria: categoriaResumenSchema,
  imagenUrl: z.string().nullable(),
  vecesPedido: z.number().int().min(1),
  precioActual: z.string(),
  eliminado: z.boolean(),
});

/**
 * US-DASH-03 - Una fila de clientes recurrentes.
 *
 * "Clientes que realizaron MAS DE UN pedido Completado": `cantidadPedidos` nunca
 * es menor a dos.
 *
 * `nombre`, `apellido` y `fotoPerfilUrl` viajan en null cuando la cuenta esta
 * eliminada. La identidad no se expone, pero la fila se conserva: la metrica
 * historica del cocinero no depende de que el cliente siga en la plataforma.
 */
export const clienteRecurrenteSchema = z.object({
  clienteId: z.uuid(),
  nombre: z.string().nullable(),
  apellido: z.string().nullable(),
  fotoPerfilUrl: z.string().nullable(),
  cantidadPedidos: z.number().int().min(2),
  montoTotal: z.string(),
  eliminado: z.boolean(),
});

/**
 * US-DASH-04 - Distribucion de pedidos por estado.
 *
 * `total` es la suma de los CUATRO estados cerrados, no el total de pedidos del
 * periodo (ese va en `resumen.pedidosTotales`). Los pedidos todavia abiertos
 * -CREADO, ACEPTADO, LISTO- quedan fuera del grafico y del denominador para que
 * los porcentajes cierren en 100 (decision del equipo del 20/08/2026): el
 * criterio enumera cuatro estados y ninguno de ellos los cubre.
 */
export const distribucionPedidosSchema = z.object({
  completados: z.number().int().min(0),
  rechazadosCocinero: z.number().int().min(0),
  canceladosCliente: z.number().int().min(0),
  expirados: z.number().int().min(0),
  total: z.number().int().min(0),
});

/**
 * Todo el dashboard en una respuesta.
 *
 * Las cuatro secciones se piden juntas porque comparten el periodo y porque
 * US-DASH-05 exige que se actualicen "de forma inmediata" al cambiarlo: cuatro
 * requests darian cuatro estados de carga desincronizados sobre una pantalla que
 * para el cocinero es una sola.
 *
 * Ninguna de las dos listas se pagina: los criterios no lo piden, el ranking
 * esta acotado por el catalogo del cocinero y "Ver todos" (US-DASH-02) expande
 * en la misma pantalla, sin ir a buscar mas datos.
 */
export const actividadCocineroSchema = z.object({
  resumen: resumenActividadSchema,
  platosMasPedidos: z.array(platoMasPedidoSchema),
  clientesRecurrentes: z.array(clienteRecurrenteSchema),
  distribucion: distribucionPedidosSchema,
});

export type RangoDashboard = z.infer<typeof rangoDashboardSchema>;
export type ResumenActividad = z.infer<typeof resumenActividadSchema>;
export type PlatoMasPedido = z.infer<typeof platoMasPedidoSchema>;
export type ClienteRecurrente = z.infer<typeof clienteRecurrenteSchema>;
export type DistribucionPedidos = z.infer<typeof distribucionPedidosSchema>;
export type ActividadCocinero = z.infer<typeof actividadCocineroSchema>;
