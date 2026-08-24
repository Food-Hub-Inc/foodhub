import { z } from 'zod';
import { MENSAJES_RESENA } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Resenas y Calificaciones
 * (US-RES-01 a US-RES-03, RF080 a RF082).
 *
 * LA RESENA ES POR PLATO, NO POR PEDIDO (decision del equipo, 2026-08-18). El
 * objeto resenado es la publicacion: una resena por par cliente-publicacion,
 * editable. El pedido no aparece en ningun contrato de este archivo porque no
 * es parte del objeto resenado; solo habilita el derecho a opinar, y esa
 * verificacion la hace el servidor contra `pedido` e `item_pedido`.
 *
 * TRES PLAZOS QUE CONVIVEN Y SE CONFUNDEN FACIL:
 *
 *   14 dias   para CREAR la resena, desde que se completa el pedido. Sale del
 *             parametro `resena_limite_dias_para_resenar` (PAN-ADM-04).
 *   48 horas  para EDITAR una resena ya publicada, desde su publicacion. Cada
 *             nuevo pedido completado con el mismo plato REABRE la ventana.
 *   3 resenas minimo para que el promedio del cocinero sea publico. Sale de
 *             `resena_minimo_para_promedio`. No es un plazo, pero es el tercer
 *             umbral parametrizable del modulo y se olvida igual de seguido.
 *
 * Los dos primeros se resuelven con las funciones puras de mas abajo, que se
 * prueban sin base de datos. El tercero vive en `lib/valoraciones.ts` porque lo
 * aplican tambien Exploracion y Publicaciones.
 */

// ---------------------------------------------------------------------------
// Constantes del dominio
// ---------------------------------------------------------------------------

/**
 * Tags positivos del formulario de resena (US-RES-01).
 *
 * Lista CERRADA: el cliente elige entre estas tres y no puede escribir las
 * suyas. Se guardan como `text[]` en `resena.tags`.
 *
 * "Puntualidad" y "Atencion del cocinero" fueron retirados a proposito por la
 * version corregida del modulo: evaluan el servicio del pedido y no el plato,
 * que es lo que esta resena califica. Si el equipo decide recuperarlos, van en
 * un requisito nuevo de valoracion de servicio por pedido, no aca.
 */
export const TAGS_RESENA_PLATO = [
  'Buena presentación',
  'Sabor excelente',
  'Porción generosa',
] as const;
export type TagResenaPlato = (typeof TAGS_RESENA_PLATO)[number];

/** Tags positivos de la calificacion del cocinero al cliente (US-RES-02). */
export const TAGS_CALIFICACION_CLIENTE = [
  'Pago puntual',
  'Buena comunicación',
  'Respetuoso',
  'Coordinación clara',
] as const;
export type TagCalificacionCliente = (typeof TAGS_CALIFICACION_CLIENTE)[number];

/**
 * Etiqueta que acompana a cada valor del selector de estrellas (US-RES-01).
 *
 * "Permita seleccionar un valor entre 1 y 5, rellenando progresivamente las
 * estrellas y mostrando al lado la etiqueta correspondiente."
 */
export const ETIQUETAS_CALIFICACION: Readonly<Record<number, string>> = {
  1: 'Mala',
  2: 'Regular',
  3: 'Buena',
  4: 'Muy buena',
  5: 'Excelente',
};

/** Ventana de edicion de una resena publicada, en horas (RF080). */
export const HORAS_VENTANA_EDICION_RESENA = 48;

/**
 * Pedidos completados que necesita un cliente para que su promedio sea visible
 * a los cocineros (US-RES-02). Por debajo se muestra "Cliente nuevo".
 *
 * NO es `resena_minimo_para_promedio`. Aquel cuenta RESENAS y aplica al
 * promedio publico del cocinero; este cuenta PEDIDOS COMPLETADOS del cliente.
 * Coinciden en el numero y en nada mas, y por eso este es una constante del
 * codigo -el criterio de aceptacion lo fija en 3- y aquel un parametro
 * editable desde el panel.
 */
export const MINIMO_PEDIDOS_PARA_REPUTACION_CLIENTE = 3;

/** Tamano de pagina del listado de resenas del perfil publico (US-RES-03). */
export const RESENAS_POR_PAGINA = 10;

// ---------------------------------------------------------------------------
// Reglas puras
// ---------------------------------------------------------------------------

/**
 * Momento hasta el cual una resena admite edicion.
 *
 * Es 48 horas despues del hito mas reciente entre su publicacion y el ultimo
 * pedido completado que incluyo el plato. El segundo termino es lo que
 * implementa "cada nuevo pedido completado reabre la ventana": sin el, un
 * cliente que vuelve a pedir el mismo plato meses despues no podria actualizar
 * una resena que ya no refleja su experiencia.
 *
 * Funcion PURA: recibe las fechas ya resueltas y no consulta nada.
 */
export function limiteDeEdicionResena(entrada: {
  fechaPublicacion: Date;
  ultimoPedidoCompletado: Date | null;
}): Date {
  const base =
    entrada.ultimoPedidoCompletado !== null &&
    entrada.ultimoPedidoCompletado > entrada.fechaPublicacion
      ? entrada.ultimoPedidoCompletado
      : entrada.fechaPublicacion;

  return new Date(base.getTime() + HORAS_VENTANA_EDICION_RESENA * 3_600_000);
}

/** `true` si la resena todavia se puede editar. `ahora` se inyecta para poder probarla. */
export function ventanaDeEdicionAbierta(
  entrada: {
    fechaPublicacion: Date;
    ultimoPedidoCompletado: Date | null;
  },
  ahora: Date = new Date(),
): boolean {
  return ahora < limiteDeEdicionResena(entrada);
}

/**
 * `true` si todavia se esta a tiempo de CREAR la resena.
 *
 * El plazo corre desde que se completa el pedido y lo fija
 * `resena_limite_dias_para_resenar`. Es independiente de la ventana de edicion:
 * un cliente puede tener el plazo de creacion vencido y aun asi poder editar
 * una resena que dejo antes, si un pedido posterior reabrio esa ventana.
 */
export function dentroDelPlazoParaResenar(
  entrada: { ultimoPedidoCompletado: Date; limiteDias: number },
  ahora: Date = new Date(),
): boolean {
  const vence = new Date(
    entrada.ultimoPedidoCompletado.getTime() +
      entrada.limiteDias * 24 * 3_600_000,
  );
  return ahora < vence;
}

/**
 * `true` si el texto contiene alguno de los terminos vetados (RF080, RF084).
 *
 * COMPARACION SIN TILDES Y SIN MAYUSCULAS, y por subcadena. Un filtro que solo
 * detecta la forma exacta escrita en la lista no filtra nada: alcanza con
 * cambiar una tilde o una mayuscula para esquivarlo.
 *
 * La lista llega por parametro y no se importa de ningun lado: la cargan los
 * administradores desde PAN-ADM-04 (`resena_terminos_moderacion`). Con la lista
 * vacia esta funcion siempre devuelve `false`, que es el comportamiento
 * deseado mientras el equipo no defina el vocabulario.
 */
export function contieneTerminoModerado(
  texto: string,
  terminos: readonly string[],
): boolean {
  if (terminos.length === 0) return false;

  const normalizado = normalizarParaModeracion(texto);
  return terminos.some((termino) => {
    const buscado = normalizarParaModeracion(termino);
    return buscado.length > 0 && normalizado.includes(buscado);
  });
}

/**
 * Minusculas y sin diacriticos, para que el filtro no dependa de como se
 * escriba.
 *
 * `normalize('NFD')` separa cada letra acentuada en la letra base mas su marca
 * diacritica, y `\p{Diacritic}` borra esas marcas. Se usa la propiedad Unicode
 * y no un rango de codigos escrito a mano porque el rango obliga a escribir
 * caracteres invisibles en el editor, que se pierden en cualquier copiar y
 * pegar; la propiedad es ASCII pura y ademas cubre marcas que el rango clasico
 * deja afuera. La bandera `u` es obligatoria para que `\p{...}` se interprete.
 */
function normalizarParaModeracion(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

// ---------------------------------------------------------------------------
// Entradas — US-RES-01, resena de un plato
// ---------------------------------------------------------------------------

const calificacionSchema = z
  .number({ message: MENSAJES_RESENA.calificacionRequerida })
  .int(MENSAJES_RESENA.calificacionRequerida)
  .min(1, MENSAJES_RESENA.calificacionRequerida)
  .max(5, MENSAJES_RESENA.calificacionRequerida);

/**
 * Campos editables de una resena. Se comparten entre el alta y la edicion
 * porque son exactamente los mismos: lo que cambia es que el alta ademas
 * necesita saber QUE publicacion se resena.
 */
const cuerpoResenaSchema = z.object({
  calificacion: calificacionSchema,
  comentario: z
    .string()
    .trim()
    .max(500, 'El comentario no puede superar los 500 caracteres.')
    .optional(),
  tags: z.array(z.enum(TAGS_RESENA_PLATO)).max(TAGS_RESENA_PLATO.length),
  // La imagen se sube antes a Supabase Storage con una URL firmada; aca solo
  // viaja la URL publica resultante. La API nunca procesa el binario.
  fotoUrl: z.url().nullable(),
});

/** US-RES-01 - Alta de la resena. PAN-RES-01. */
export const crearResenaSchema = cuerpoResenaSchema.extend({
  publicacionId: z.uuid('La publicación indicada no es válida.'),
});

/** US-RES-01 - Edicion dentro de la ventana de 48 horas. */
export const editarResenaSchema = cuerpoResenaSchema;

// ---------------------------------------------------------------------------
// Entradas — US-RES-02, calificacion del cocinero al cliente
// ---------------------------------------------------------------------------

/**
 * US-RES-02 - Alta o edicion de la calificacion de un cliente. PAN-RES-02.
 *
 * Un unico contrato para las dos operaciones porque el modelo tiene una sola
 * calificacion vigente por par cocinero-cliente: el endpoint es un PUT y el
 * servicio resuelve si inserta o actualiza. Separar alta y edicion obligaria al
 * cliente de la API a saber de antemano cual de las dos corresponde.
 */
export const calificarClienteSchema = z.object({
  calificacion: calificacionSchema,
  comentario: z
    .string()
    .trim()
    .max(300, 'El comentario no puede superar los 300 caracteres.')
    .optional(),
  tags: z
    .array(z.enum(TAGS_CALIFICACION_CLIENTE))
    .max(TAGS_CALIFICACION_CLIENTE.length),
});

// ---------------------------------------------------------------------------
// Entradas — US-RES-03, listado del perfil publico
// ---------------------------------------------------------------------------

/**
 * Orden del listado de resenas (US-RES-03).
 *
 * Falta "Mas utiles", que el criterio tambien enumera: ordena por cantidad de
 * reacciones y las reacciones son US-RES-04, fuera de este PR. Se agrega el
 * valor cuando exista de que ordenar.
 */
export const ORDEN_RESENAS = [
  'MAS_RECIENTES',
  'MEJOR_CALIFICACION',
  'PEOR_CALIFICACION',
] as const;
export type OrdenResenas = (typeof ORDEN_RESENAS)[number];

/**
 * US-RES-03 - Filtros del listado.
 *
 * Falta el toggle "Solo resenas con respuesta del cocinero" por el mismo motivo
 * que "Mas utiles": depende de US-RES-05.
 */
export const filtrosResenasSchema = z.object({
  orden: z.enum(ORDEN_RESENAS).default('MAS_RECIENTES'),
  // Multi-seleccion de 1 a 5 estrellas. Vacio o ausente = sin filtrar.
  estrellas: z
    .union([
      z.coerce.number().int().min(1).max(5),
      z.array(z.coerce.number().int().min(1).max(5)),
    ])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
  /**
   * Llega como "true"/"false" por query string. Se reusa el mismo criterio que
   * `casillaEnQuerySchema` en exploracion.schema.ts: `z.coerce.boolean()` no
   * sirve porque convierte cualquier string no vacio en `true`, con lo cual
   * "false" daria `true` y el toggle quedaria siempre encendido.
   */
  soloConFoto: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(RESENAS_POR_PAGINA),
});

// ---------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------

/**
 * Autor de una resena tal como se muestra en el perfil publico.
 *
 * `nombre` puede ser el literal "Usuario eliminado" (US-RES-04): la baja de la
 * cuenta es logica y la resena sobrevive, pero deja de mostrar la identidad.
 * Se resuelve en el servidor para que las tres pantallas que muestran resenas
 * no repitan la misma condicion.
 */
export const autorResenaSchema = z.object({
  id: z.uuid().nullable(),
  nombre: z.string(),
  fotoPerfilUrl: z.url().nullable(),
});

/** Una resena en el listado del perfil publico (US-RES-03). */
export const resenaPublicaSchema = z.object({
  id: z.uuid(),
  autor: autorResenaSchema,
  publicacionId: z.uuid(),
  /** Nombre del plato, o "[Plato no disponible]" si la publicacion fue dada de baja. */
  nombrePlato: z.string(),
  /** `false` cuando la publicacion esta dada de baja: la fila se ve, el enlace no navega. */
  enlaceAlPlatoHabilitado: z.boolean(),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().nullable(),
  tags: z.array(z.string()),
  fotoUrl: z.url().nullable(),
  editada: z.boolean(),
  fechaPublicacion: z.iso.datetime(),
});

/**
 * Resumen de la cabecera de la seccion de resenas (US-RES-03).
 *
 * `promedio` es `null` -y no 0- cuando no hay resenas VISIBLE o cuando todavia
 * no se alcanzo `resena_minimo_para_promedio`: son dos situaciones en las que
 * no hay un promedio que mostrar, y un 0 se leeria como "pesimo".
 * `alcanzaMinimoParaPromedio` distingue los dos casos para la interfaz.
 */
export const resumenResenasSchema = z.object({
  promedio: z.number().nullable(),
  total: z.number().int().min(0),
  conFoto: z.number().int().min(0),
  alcanzaMinimoParaPromedio: z.boolean(),
  /** Cantidad de resenas por cada nivel, de 1 a 5 estrellas. */
  distribucion: z.record(z.string(), z.number().int().min(0)),
});

export const paginaResenasSchema = z.object({
  datos: z.array(resenaPublicaSchema),
  resumen: resumenResenasSchema,
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

/**
 * Estado de la resena del cliente autenticado sobre una publicacion (RF031).
 *
 * Es lo que decide cual de los tres botones dibuja el detalle del pedido:
 * "Dejar resena", "Editar mi resena" o "Ver mi resena". Se resuelve en el
 * servidor porque depende de dos plazos y del historial de pedidos del
 * cliente, ninguno de los cuales la pantalla conoce.
 */
export const estadoResenaPublicacionSchema = z.object({
  publicacionId: z.uuid(),
  resenaId: z.uuid().nullable(),
  /** Hay pedido completado con el plato, no hay resena y el plazo no vencio. */
  puedeResenar: z.boolean(),
  /** Ya hay resena y la ventana de 48 horas sigue abierta. */
  puedeEditar: z.boolean(),
});

export const estadoResenasSchema = z.object({
  datos: z.array(estadoResenaPublicacionSchema),
});

/** US-RES-02 - La calificacion que el cocinero de la sesion le puso a un cliente. */
export const miCalificacionClienteSchema = z.object({
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().nullable(),
  tags: z.array(z.string()),
  fechaPublicacion: z.iso.datetime(),
});

/**
 * US-RES-02 - Reputacion de un cliente, tal como la ve OTRO cocinero en el
 * detalle del pedido.
 *
 * `esClienteNuevo` manda sobre `promedio`: cuando es `true` la pantalla muestra
 * "Cliente nuevo" aunque haya calificaciones cargadas. El umbral son pedidos
 * completados, no calificaciones recibidas.
 */
export const reputacionClienteSchema = z.object({
  promedio: z.number().nullable(),
  cantidadCocineros: z.number().int().min(0),
  esClienteNuevo: z.boolean(),
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CrearResenaInput = z.infer<typeof crearResenaSchema>;
export type EditarResenaInput = z.infer<typeof editarResenaSchema>;
export type CalificarClienteInput = z.infer<typeof calificarClienteSchema>;
export type FiltrosResenas = z.infer<typeof filtrosResenasSchema>;
export type AutorResena = z.infer<typeof autorResenaSchema>;
export type ResenaPublica = z.infer<typeof resenaPublicaSchema>;
export type ResumenResenas = z.infer<typeof resumenResenasSchema>;
export type PaginaResenas = z.infer<typeof paginaResenasSchema>;
export type EstadoResenaPublicacion = z.infer<
  typeof estadoResenaPublicacionSchema
>;
export type EstadoResenas = z.infer<typeof estadoResenasSchema>;
export type MiCalificacionCliente = z.infer<typeof miCalificacionClienteSchema>;
export type ReputacionCliente = z.infer<typeof reputacionClienteSchema>;
