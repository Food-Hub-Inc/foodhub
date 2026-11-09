import { z } from 'zod';
import {
  ESTADO_RESENA,
  TIPO_REACCION,
  TIPO_RESENA,
} from '../constants/enums.js';
import { MENSAJES_RESENA } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Resenas y Calificaciones
 * (US-RES-01 a US-RES-07, RF080 a RF087).
 *
 * UNA RESENA SE IDENTIFICA POR (AUTOR, OBJETO RESENADO), y el objeto es un
 * PLATO, un COCINERO o un CLIENTE. Hay una sola resena por autor y objeto: si
 * se vuelve a opinar, se edita la que ya existe.
 *
 * EL PEDIDO NO APARECE EN NINGUN CONTRATO DE ESTE ARCHIVO. No es parte del
 * objeto resenado: solo habilita el derecho a opinar, y esa verificacion la
 * hace el servidor contra el historial de pedidos. Que el cliente mandara el
 * pedido seria darle a elegir con cual se habilita.
 *
 * DOS PLAZOS Y UN UMBRAL QUE SE CONFUNDEN FACIL:
 *
 *   14 dias   para CREAR la resena de un plato, desde que se completa el
 *             pedido. Sale del parametro `resena_limite_dias_para_resenar`
 *             (PAN-ADM-04).
 *   48 horas  para EDITAR una resena de PLATO ya publicada. Cada nuevo pedido
 *             completado con el mismo plato REABRE la ventana. Las resenas a
 *             un cocinero y a un cliente NO tienen ventana: son la opinion
 *             vigente sobre una persona y se editan siempre.
 *   3 resenas minimo para que el promedio POR PLATO sea publico. Sale de
 *             `resena_minimo_para_promedio`. No es un plazo, pero es el tercer
 *             umbral parametrizable del modulo y se olvida igual de seguido.
 *
 * Los dos plazos se resuelven con las funciones puras de mas abajo, que se
 * prueban sin base de datos. El umbral vive en `lib/valoraciones.ts` porque lo
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
 * Tags de la calificacion al cocinero (RF087).
 *
 * ACA VIVEN "Puntualidad" Y "Atencion del cocinero", los dos que la version
 * corregida del modulo retiro del formulario de resena de plato: evaluan el
 * SERVICIO del pedido y no el producto. Que "Buena comunicacion" aparezca
 * tambien en `TAGS_CALIFICACION_CLIENTE` no es un error: las dos direcciones
 * valoran la coordinacion y cada lista responde a su propio criterio.
 */
export const TAGS_CALIFICACION_COCINERO = [
  'Puntualidad',
  'Atención del cocinero',
  'Buena comunicación',
  'Pedido completo',
] as const;
export type TagCalificacionCocinero =
  (typeof TAGS_CALIFICACION_COCINERO)[number];

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
 * Lo que tienen en comun las tres resenas: la nota y un comentario opcional.
 *
 * El tope del comentario NO esta aca porque cambia con el tipo -500 en PLATO y
 * COCINERO, 300 en CLIENTE-, y tampoco los tags, que son un set distinto por
 * tipo. Cada rama del alta agrega los suyos.
 */
const comentarioHasta = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, `El comentario no puede superar los ${maximo} caracteres.`)
    .optional();

const camposDeResenaDePlato = {
  calificacion: calificacionSchema,
  comentario: comentarioHasta(500),
  tags: z.array(z.enum(TAGS_RESENA_PLATO)).max(TAGS_RESENA_PLATO.length),
  // La imagen se sube antes a Supabase Storage con una URL firmada; aca solo
  // viaja la URL publica resultante. La API nunca procesa el binario.
  fotoUrl: z.url().nullable(),
};

const camposDeResenaACocinero = {
  calificacion: calificacionSchema,
  // 500 y no 300: el criterio de US-RES-07 fija ese tope, distinto del de US-RES-02.
  comentario: comentarioHasta(500),
  tags: z
    .array(z.enum(TAGS_CALIFICACION_COCINERO))
    .max(TAGS_CALIFICACION_COCINERO.length),
};

const camposDeResenaACliente = {
  calificacion: calificacionSchema,
  comentario: comentarioHasta(300),
  tags: z
    .array(z.enum(TAGS_CALIFICACION_CLIENTE))
    .max(TAGS_CALIFICACION_CLIENTE.length),
};

/**
 * Alta de una resena, discriminada por lo que se resena.
 *
 * UN SOLO CONTRATO PARA LOS TRES CASOS porque los tres describen el mismo
 * hecho -alguien opina sobre algo- y solo cambian el destino, el tope del
 * comentario y el set de tags. La union discriminada deja que zod elija la
 * rama y rechace, por ejemplo, un tag de plato en una resena al cocinero.
 *
 * NINGUNA RAMA RECIBE UN PEDIDO. El derecho a resenar se verifica en el
 * servidor contra el historial de pedidos; que el cliente mandara el pedido
 * seria darle a elegir con cual se habilita.
 */
export const crearResenaSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('PLATO'),
    publicacionId: z.uuid('La publicación indicada no es válida.'),
    ...camposDeResenaDePlato,
  }),
  z.object({
    tipo: z.literal('COCINERO'),
    cocineroId: z.uuid('El cocinero indicado no es válido.'),
    ...camposDeResenaACocinero,
  }),
  z.object({
    tipo: z.literal('CLIENTE'),
    clienteId: z.uuid('El cliente indicado no es válido.'),
    ...camposDeResenaACliente,
  }),
]);

/**
 * Edicion de una resena existente. No lleva destino -lo determina el id de la
 * fila- pero si el tipo, para saber contra que set validar los tags. El
 * servicio verifica que coincida con el de la fila antes de escribir.
 */
export const editarResenaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('PLATO'), ...camposDeResenaDePlato }),
  z.object({ tipo: z.literal('COCINERO'), ...camposDeResenaACocinero }),
  z.object({ tipo: z.literal('CLIENTE'), ...camposDeResenaACliente }),
]);

// ---------------------------------------------------------------------------
// Entradas — US-RES-03, listado del perfil publico
// ---------------------------------------------------------------------------

/**
 * Orden del listado de resenas (US-RES-03).
 *
 * "MAS_UTILES" ordena por cantidad de reacciones "Me gusta" (US-RES-04). Se
 * incorporo cuando existieron las reacciones; antes ofrecerlo habria devuelto
 * siempre lo mismo.
 */
export const ORDEN_RESENAS = [
  'MAS_RECIENTES',
  'MEJOR_CALIFICACION',
  'PEOR_CALIFICACION',
  'MAS_UTILES',
] as const;
export type OrdenResenas = (typeof ORDEN_RESENAS)[number];

/** US-RES-03 - Filtros del listado. */
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
  /** US-RES-05: "Solo resenas con respuesta del cocinero". Mismo criterio de parseo. */
  soloConRespuesta: z
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

/**
 * Respuesta pública del cocinero a una reseña (US-RES-05, RF084).
 *
 * `puedeEditar` lo resuelve el servidor contra `fecha_edicion_limite`: la
 * pantalla no puede decidirlo sola porque compararía contra el reloj del
 * teléfono, que el usuario controla.
 */
export const respuestaCocineroSchema = z.object({
  id: z.uuid(),
  contenido: z.string(),
  editada: z.boolean(),
  fechaPublicacion: z.iso.datetime(),
  puedeEditar: z.boolean(),
});

/**
 * Los datos del plato resenado. Solo viaja en las resenas de tipo PLATO; en
 * las otras dos es `null`, y eso le alcanza a la tarjeta para saber si dibuja
 * la linea "Sobre: [plato]".
 */
export const platoResenadoSchema = z.object({
  publicacionId: z.uuid(),
  /** Nombre del plato, o "[Plato no disponible]" si la publicacion fue dada de baja. */
  nombre: z.string(),
  /** `false` cuando la publicacion esta dada de baja: la fila se ve, el enlace no navega. */
  enlaceHabilitado: z.boolean(),
});

/**
 * La conversacion publica alrededor de una resena: reacciones (US-RES-04),
 * respuesta del cocinero (US-RES-05) y reporte (US-RES-06).
 *
 * ES `null` EN LAS RESENAS DE TIPO CLIENTE, y no es un olvido: el cliente no
 * las ve, asi que no hay conversacion publica que tener sobre ellas. Que viaje
 * como un objeto anulable en vez de tres campos sueltos hace que la tarjeta lo
 * resuelva con una guarda en lugar de con tres condiciones dispersas.
 */
export const socialDeResenaSchema = z.object({
  /**
   * US-RES-04. `mia` es la reaccion del usuario de la sesion, o `null`; los
   * contadores son de todos. Viajan siempre, tambien sobre la resena propia:
   * ahi la pantalla dibuja el total en solo lectura en lugar de los botones.
   */
  reacciones: z.object({
    meGusta: z.number().int().min(0),
    noMeGusta: z.number().int().min(0),
    mia: z.enum(TIPO_REACCION).nullable(),
  }),
  /** US-RES-05. `null` mientras el cocinero no haya respondido. */
  respuesta: respuestaCocineroSchema.nullable(),
  /** `true` si el usuario de la sesion ya la reporto (US-RES-06). */
  reportadaPorMi: z.boolean(),
});

/**
 * Una resena en cualquiera de los cuatro listados que existen: las de un
 * plato, las de un cocinero, las de los platos de un cocinero y las de un
 * cliente.
 *
 * `tipo` dice sobre que se opino, y de el dependen los dos objetos anulables:
 * `plato` solo en PLATO, `social` en PLATO y COCINERO.
 */
export const resenaPublicaSchema = z.object({
  id: z.uuid(),
  tipo: z.enum(TIPO_RESENA),
  autor: autorResenaSchema,
  plato: platoResenadoSchema.nullable(),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().nullable(),
  tags: z.array(z.string()),
  fotoUrl: z.url().nullable(),
  editada: z.boolean(),
  fechaPublicacion: z.iso.datetime(),
  social: socialDeResenaSchema.nullable(),

  /**
   * `true` si la escribio el usuario de la sesion. Decide dos cosas de
   * US-RES-06 -reportar la ajena, eliminar la propia- y si se dibujan los
   * botones de reaccion.
   */
  esMia: z.boolean(),
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

/**
 * Perfil publico de un cliente, tal como lo ve un cocinero.
 *
 * NO LLEVA `email` NI `ubicacion`, Y NO ES UN DESCUIDO. El correo identifica a
 * la persona fuera de la plataforma, y `usuario.ubicacion` es el punto exacto
 * que el cliente declaro -no una zona-, asi que publicarlo a cualquier cocinero
 * seria decir donde vive. Los dos estan disponibles en la misma consulta que
 * arma esto: no se agregan.
 *
 * Tampoco lleva `motivo_suspension` ni los campos de aceptacion de terminos,
 * que son internos. Por eso este contrato existe en vez de reusar
 * `perfilUsuarioSchema`, que si trae todo eso y por lo mismo su endpoint es
 * `soloAdministrador`.
 */
export const perfilPublicoClienteSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
  fotoPerfilUrl: z.url().nullable(),
  /** Alimenta el "Miembro desde <mes> de <ano>" de la ficha. */
  fechaRegistro: z.iso.datetime(),
  /** La cuenta se dio de baja: la pantalla muestra la identidad como no disponible. */
  cuentaEliminada: z.boolean(),
  reputacion: reputacionClienteSchema,
});

// ---------------------------------------------------------------------------
// US-RES-07 / RF087 — el CLIENTE resena al COCINERO
// ---------------------------------------------------------------------------

/**
 * LA RESENA AL COCINERO NO TIENE VENTANA DE EDICION, y por eso aca no hay una
 * constante ni una funcion como las de la resena de plato.
 *
 * La tenia -48 horas- mientras fue "una por pedido": se justificaba en que la
 * calificacion referia a la experiencia de un pedido determinado, y por eso no
 * se reabria. Al pasar a ser una por cocinero deja de referirse a un pedido y
 * pasa a ser la opinion vigente del cliente sobre esa persona, que puede
 * cambiar con cada pedido nuevo. Congelarla a las 48 horas del primero
 * obligaria al cliente a arrastrar para siempre una opinion que ya no tiene.
 */

/**
 * Que puede hacer el usuario de la sesion respecto de OTRA PERSONA: resenarla,
 * editar la resena que ya le dejo, o nada.
 *
 * UN SOLO CONTRATO PARA LAS DOS DIRECCIONES -el cliente sobre el cocinero
 * (US-RES-07) y el cocinero sobre el cliente (US-RES-02)- porque desde la
 * correccion del modelo las dos son la misma pregunta: hay una unica resena
 * por par, y lo que cambia es que hito del pedido la habilita. La persona no
 * viaja en el cuerpo: ya esta en la URL.
 *
 * ES POR PERSONA Y NO POR PEDIDO. Lo consultan el boton del perfil publico
 * (US-RES-03) y el del detalle del pedido (RF031), que ahora preguntan lo
 * mismo.
 *
 * Trae ademas la resena vigente, asi el formulario se precarga con una sola
 * consulta en vez de encadenar dos.
 *
 * `puedeResenar` lo resuelve el servidor porque depende del historial de
 * pedidos entre las dos personas, que la pantalla no conoce.
 */
export const estadoResenaPersonaSchema = z.object({
  /**
   * Hubo un pedido que habilita la resena: COMPLETADO para resenar a un
   * cocinero, ACEPTADO para resenar a un cliente -US-RES-02 quiere que el
   * cocinero pueda dejar constancia del que no aparecio a retirar, y ese
   * pedido nunca se completa-.
   */
  puedeResenar: z.boolean(),
  /** La resena vigente sobre esa persona, si ya la dejo. */
  mia: resenaPublicaSchema.nullable(),
});

// ---------------------------------------------------------------------------
// US-RES-04 / RF083 — reacciones
// ---------------------------------------------------------------------------

/**
 * Marcar o cambiar la reaccion sobre una resena.
 *
 * UN SOLO ENDPOINT PARA LAS TRES ACCIONES del criterio -marcar, cambiar y
 * desmarcar-, porque las tres describen el mismo hecho: cual es la reaccion
 * vigente de este usuario sobre esta resena. `tipo: null` es "ninguna", que es
 * lo que deja tocar de nuevo el boton ya marcado. Tres endpoints separados
 * obligarian a la pantalla a saber en cual de los tres casos esta antes de
 * llamar, y ese estado ya lo tiene el servidor.
 */
export const reaccionarSchema = z.object({
  tipo: z.enum(TIPO_REACCION).nullable(),
});

// ---------------------------------------------------------------------------
// US-RES-05 / RF084 — respuesta del cocinero
// ---------------------------------------------------------------------------

/**
 * Ventana de edicion de la respuesta, en horas (RF084).
 *
 * SON 24 Y NO 48: es el tercer plazo del modulo y el mas corto. El requisito lo
 * justifica -"de modo que el contenido no pueda alterarse despues de que el
 * cliente lo haya leido"- y se persiste ademas en la columna
 * `respuesta_cocinero.fecha_edicion_limite`, porque el requisito la nombra
 * explicitamente como atributo.
 */
export const HORAS_VENTANA_EDICION_RESPUESTA = 24;

/** `true` si la respuesta todavia admite edicion. `ahora` se inyecta para probarla. */
export function ventanaDeRespuestaAbierta(
  fechaEdicionLimite: Date | null,
  ahora: Date = new Date(),
): boolean {
  if (fechaEdicionLimite === null) return false;
  return ahora.getTime() < fechaEdicionLimite.getTime();
}

/** RF084 - Alta o edicion de la respuesta. Una sola por resena. */
export const responderResenaSchema = z.object({
  contenido: z
    .string()
    .trim()
    .min(1, 'La respuesta no puede estar vacía.')
    .max(500, 'La respuesta no puede superar los 500 caracteres.'),
});

// ---------------------------------------------------------------------------
// US-RES-06 / RF085 y RF086 — reportes y moderacion
// ---------------------------------------------------------------------------

/** Motivos del reporte (RF085). Lista cerrada, multi-seleccion. */
export const MOTIVOS_REPORTE = [
  'Contenido ofensivo o discriminatorio',
  'Lenguaje inapropiado',
  'Información falsa o engañosa',
  'Spam o publicidad',
  'Datos personales de terceros',
  'Otro',
] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

/**
 * RF085 - Reporte de una resena.
 *
 * EL DETALLE ES OBLIGATORIO SI SE ELIGE "Otro" y opcional en los demas casos.
 * El criterio lo dice asi, y tiene sentido: los otros cinco motivos ya nombran
 * el problema, y "Otro" sin explicacion no le sirve a nadie en la bandeja de
 * moderacion. Se valida con `superRefine` porque la regla cruza dos campos.
 */
export const reportarResenaSchema = z
  .object({
    motivos: z
      .array(z.enum(MOTIVOS_REPORTE))
      .min(1, MENSAJES_RESENA.reporteSinMotivo)
      .max(MOTIVOS_REPORTE.length),
    detalleAdicional: z
      .string()
      .trim()
      .max(500, 'El detalle no puede superar los 500 caracteres.')
      .optional(),
  })
  .superRefine((valor, ctx) => {
    const pideDetalle = valor.motivos.includes('Otro');
    const sinDetalle = (valor.detalleAdicional ?? '').length === 0;

    if (pideDetalle && sinDetalle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['detalleAdicional'],
        message: 'Contanos qué pasó para poder revisarlo.',
      });
    }
  });

/** Una denuncia ya resuelta, con quien la hizo. */
export const denunciaAnteriorSchema = z.object({
  reportanteNombre: z.string(),
  motivos: z.array(z.string()),
  detalle: z.string().nullable(),
  fechaReporte: z.iso.datetime(),
});

/**
 * Correccion del 20/10/2026 - Una ronda de moderacion ya cerrada sobre la
 * resena: las denuncias que juntaba y que decidio el administrador.
 *
 * ES POR RONDA Y NO POR DENUNCIA porque asi se resuelve: RF086 cierra de una
 * vez todos los reportes pendientes de la resena, con el mismo administrador
 * y la misma fecha. Una resena que se dejo visible y la volvieron a denunciar
 * llega a la bandeja con una ronda en su historial.
 */
export const resolucionAnteriorSchema = z.object({
  /** APROBADO oculto la resena; RECHAZADO la dejo visible. */
  decision: z.enum(['APROBADO', 'RECHAZADO']),
  /** `null` si la cuenta del administrador ya no existe. */
  adminNombre: z.string().nullable(),
  fechaResolucion: z.iso.datetime(),
  denuncias: z.array(denunciaAnteriorSchema).min(1),
});

/** RF086 - Un reporte en la bandeja de moderacion del administrador. */
export const reporteModeracionSchema = z.object({
  resenaId: z.uuid(),
  /** Cuantos usuarios distintos reportaron ESTA resena. */
  cantidadReportes: z.number().int().min(1),
  /** Union de los motivos de todos los reportes, sin repetir. */
  motivos: z.array(z.string()),
  detalles: z.array(z.string()),
  fechaPrimerReporte: z.iso.datetime(),

  /** La resena reportada, con su contexto para poder decidir. */
  resena: z.object({
    id: z.uuid(),
    autorNombre: z.string(),
    calificacion: z.number().int().min(1).max(5),
    comentario: z.string().nullable(),
    fotoUrl: z.url().nullable(),
    fechaPublicacion: z.iso.datetime(),
    estadoResena: z.enum(ESTADO_RESENA),
    /**
     * Sobre que se opino. El administrador necesita saberlo para entender que
     * esta por ocultar: una resena de un plato y una opinion sobre el trato de
     * un cocinero se moderan con criterios distintos.
     */
    tipo: z.enum(TIPO_RESENA),
    /** Solo en las de tipo PLATO; `null` en las demas. */
    nombrePlato: z.string().nullable(),
    /** El cocinero involucrado: dueno del plato, o el resenado. `null` en las de tipo CLIENTE. */
    cocineroNombre: z.string().nullable(),
  }),

  /** Rondas de moderacion anteriores, la mas reciente primero. */
  historial: z.array(resolucionAnteriorSchema),
});

export const paginaReportesSchema = z.object({
  datos: z.array(reporteModeracionSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

/**
 * RF086 - Resolucion de los reportes de una resena.
 *
 * `aprobar` decide las dos ramas del requisito: aprobado oculta la resena y
 * recalcula los promedios; rechazado la deja visible y avisa a quienes
 * reportaron. Se resuelven TODOS los reportes pendientes de esa resena de una
 * vez, porque la decision es sobre la resena y no sobre cada denuncia.
 */
export const resolverReporteSchema = z.object({
  aprobar: z.boolean(),
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CrearResenaInput = z.infer<typeof crearResenaSchema>;
export type EditarResenaInput = z.infer<typeof editarResenaSchema>;
export type FiltrosResenas = z.infer<typeof filtrosResenasSchema>;
export type AutorResena = z.infer<typeof autorResenaSchema>;
export type PlatoResenado = z.infer<typeof platoResenadoSchema>;
export type SocialDeResena = z.infer<typeof socialDeResenaSchema>;
export type ResenaPublica = z.infer<typeof resenaPublicaSchema>;
export type ResumenResenas = z.infer<typeof resumenResenasSchema>;
export type PaginaResenas = z.infer<typeof paginaResenasSchema>;
export type EstadoResenaPublicacion = z.infer<
  typeof estadoResenaPublicacionSchema
>;
export type EstadoResenas = z.infer<typeof estadoResenasSchema>;
export type EstadoResenaPersona = z.infer<typeof estadoResenaPersonaSchema>;
export type ReputacionCliente = z.infer<typeof reputacionClienteSchema>;
export type PerfilPublicoCliente = z.infer<typeof perfilPublicoClienteSchema>;
export type ReaccionarInput = z.infer<typeof reaccionarSchema>;
export type RespuestaCocinero = z.infer<typeof respuestaCocineroSchema>;
export type ResponderResenaInput = z.infer<typeof responderResenaSchema>;
export type ReportarResenaInput = z.infer<typeof reportarResenaSchema>;
export type DenunciaAnterior = z.infer<typeof denunciaAnteriorSchema>;
export type ResolucionAnterior = z.infer<typeof resolucionAnteriorSchema>;
export type ReporteModeracion = z.infer<typeof reporteModeracionSchema>;
export type PaginaReportes = z.infer<typeof paginaReportesSchema>;
export type ResolverReporteInput = z.infer<typeof resolverReporteSchema>;
