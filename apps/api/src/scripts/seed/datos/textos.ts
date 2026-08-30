/**
 * Textos libres del dataset: comentarios, mensajes de chat, motivos escritos a
 * mano y tickets de soporte.
 *
 * Todo lo de este archivo es contenido que en el sistema real escribe una
 * persona. Se agrupa aca en vez de quedar disperso entre los pasos de la seed
 * para que se pueda ampliar o traducir sin tocar la logica: los pasos eligen
 * de estas listas, no arman frases.
 */

/** Comentarios de resena agrupados por cantidad de estrellas. */
export const COMENTARIOS_RESENA: Readonly<
  Record<1 | 2 | 3 | 4 | 5, readonly string[]>
> = {
  5: [
    'Impecable. Llegó caliente, bien presentado y la porción rendía para dos.',
    'Lo mejor que pedí en la zona. Se nota que está hecho en casa.',
    'Puntualísima y muy amable. El plato tal cual la foto.',
    'Repetimos por tercera vez y siempre sale igual de bien.',
    'Sabor casero de verdad. Ya lo recomendé a media oficina.',
    'Muy buena atención por chat y el pedido salió antes de lo estimado.',
    'Cantidad generosa y precio justo. Diez puntos.',
  ],
  4: [
    'Muy rico. Le pongo cuatro porque tardó un poco más de lo estimado.',
    'Buen plato, la porción es más chica de lo que esperaba pero está bien hecho.',
    'Muy bueno. La próxima pido con menos sal, pero nada grave.',
    'Cumplió. Volvería a pedir sin dudarlo.',
    'Rico y bien envasado para el traslado. Le falta un poquito de salsa.',
    'Buena relación precio-calidad, lo recomiendo.',
  ],
  3: [
    'Está bien, sin más. Esperaba un poco más de sabor.',
    'Cumple, pero llegó tibio.',
    'La porción quedó justa para una persona, no para dos como decía.',
    'Correcto. Nada para destacar ni para quejarse.',
    'Rico pero tardó bastante más de lo que decía la publicación.',
  ],
  2: [
    'Llegó frío y la presentación no era la de la foto.',
    'La porción fue notoriamente más chica de lo publicado.',
    'Tardó casi el doble de lo estimado y no avisaron.',
    'Le faltó cocción. No repetiría.',
  ],
  1: [
    'No era lo que pedí y no hubo respuesta por el chat.',
    'Llegó frío, con poca cantidad y tarde. Muy mala experiencia.',
    'Cancelaron sobre la hora sin explicación.',
  ],
};

/** Etiquetas rapidas del formulario de resena (`resena.tags`). */
export const TAGS_RESENA_POSITIVAS = [
  'puntual',
  'bien presentado',
  'porción generosa',
  'sabor casero',
  'buena atención',
  'llegó caliente',
  'buen precio',
] as const;

export const TAGS_RESENA_NEGATIVAS = [
  'demorado',
  'porción chica',
  'llegó frío',
  'distinto a la foto',
  'poca comunicación',
] as const;

/** Comentarios del cocinero al calificar a un cliente. */
export const COMENTARIOS_CALIFICACION_CLIENTE: Readonly<
  Record<1 | 2 | 3 | 4 | 5, readonly string[]>
> = {
  5: [
    'Excelente trato, pasó a retirar en horario y dejó todo claro por el chat.',
    'Cliente de siempre, siempre puntual. Un gusto cocinarle.',
    'Muy amable y avisó apenas salió a buscarlo.',
  ],
  4: [
    'Todo bien, solo tardó un rato en pasar a retirar.',
    'Buen trato. Coordinamos sin problemas.',
  ],
  3: [
    'Sin inconvenientes, aunque costó coordinar el horario.',
    'Correcto. Respondió tarde algunos mensajes.',
  ],
  2: [
    'Pasó a retirar bastante después de lo acordado y quedó frío por eso.',
    'Cambió el horario dos veces sobre la hora.',
  ],
  1: ['Confirmó el pedido y nunca pasó a retirarlo.'],
};

export const TAGS_CALIFICACION_CLIENTE = [
  'puntual',
  'buena comunicación',
  'coordina fácil',
  'demoró en retirar',
  'cambió el horario',
] as const;

/** Respuestas del cocinero a una resena (derecho a replica). */
export const RESPUESTAS_COCINERO: Readonly<
  Record<'positiva' | 'neutra' | 'negativa', readonly string[]>
> = {
  positiva: [
    '¡Gracias! Me alegra un montón que lo hayan disfrutado. Los espero para el próximo.',
    'Gracias por tomarte el tiempo de escribir. Nos vemos en el próximo pedido.',
    'Mil gracias. Comentarios así son los que dan ganas de seguir cocinando.',
  ],
  neutra: [
    'Gracias por el comentario, tomo nota de lo del tiempo de entrega para mejorarlo.',
    'Te agradezco la devolución. La próxima ajusto la porción.',
  ],
  negativa: [
    'Lamento mucho la experiencia. Ese día tuve un problema con el horno y salió más tarde de lo previsto. Escribime por privado y lo compensamos.',
    'Perdón por lo que pasó, no es lo habitual. Ya cambié la forma de envasar para que llegue caliente.',
    'Lamento el inconveniente. Me hago cargo y me gustaría que lo vuelvas a probar sin cargo.',
  ],
};

/** Motivos que el cocinero escribe a mano al rechazar (US-PED-04). */
export const MOTIVOS_RECHAZO_ESCRITOS = [
  'Me quedé sin masa para hoy, disculpas.',
  'Se me cortó la luz y no puedo usar el horno.',
  'Ya tengo la agenda completa para ese horario.',
  'No llego a tenerlo listo a la hora que necesitás.',
  'Me falta un ingrediente clave del plato.',
] as const;

/** Instrucciones que el cliente deja al confirmar el pedido. */
export const INSTRUCCIONES_CLIENTE = [
  'Poca sal por favor.',
  'Paso a retirar 21:30, gracias.',
  'Si podés, mandalo con la salsa aparte.',
  'Sin cebolla, soy alérgico.',
  'Es para llevar, envolvelo bien que voy en moto.',
  'Toco timbre en el 3B.',
  'Si podés cortarlo en porciones, mejor.',
  'Lo necesito para las 13 en punto, gracias.',
] as const;

/**
 * Guiones de conversacion entre cliente y cocinero.
 *
 * Cada guion es una lista de turnos. `de` indica quien habla: el cliente que
 * hizo el pedido o el cocinero que lo recibio. La seed los reparte entre las
 * conversaciones y ajusta las fechas para que sean coherentes con el pedido.
 */
export interface TurnoChat {
  de: 'CLIENTE' | 'COCINERO';
  texto: string;
}

export const GUIONES_CHAT: readonly TurnoChat[][] = [
  [
    {
      de: 'CLIENTE',
      texto: 'Hola! Recién te hice un pedido, ¿llego a retirarlo a las 21?',
    },
    { de: 'COCINERO', texto: 'Hola! Sí, sin problema. Lo tengo listo 20:45.' },
    { de: 'CLIENTE', texto: 'Genial, gracias!' },
    { de: 'COCINERO', texto: 'Ya está listo, cuando quieras pasás 👍' },
    { de: 'CLIENTE', texto: 'Salgo para allá, llego en 10 minutos.' },
  ],
  [
    {
      de: 'CLIENTE',
      texto: 'Buenas! ¿La docena viene surtida o son todas del mismo gusto?',
    },
    {
      de: 'COCINERO',
      texto: 'Como quieras. Si me decís los gustos te la armo mitad y mitad.',
    },
    {
      de: 'CLIENTE',
      texto: 'Perfecto, media de carne y media de humita entonces.',
    },
    { de: 'COCINERO', texto: 'Anotado. Te aviso cuando salgan del horno.' },
  ],
  [
    { de: 'CLIENTE', texto: 'Hola, ¿tenés opción sin TACC?' },
    {
      de: 'COCINERO',
      texto:
        'Por ahora no, trabajo con harina común en la misma cocina así que no te lo puedo garantizar.',
    },
    { de: 'CLIENTE', texto: 'Gracias por avisar igual!' },
  ],
  [
    { de: 'CLIENTE', texto: 'Buenas, ¿cuánto tarda aproximadamente?' },
    {
      de: 'COCINERO',
      texto:
        'Unos 40 minutos desde que lo acepto. Hoy estoy con poco movimiento así que sale antes.',
    },
    { de: 'CLIENTE', texto: 'Buenísimo, lo confirmo.' },
    { de: 'COCINERO', texto: 'Listo, ya lo tomé. Te aviso.' },
    { de: 'COCINERO', texto: 'Salió! Está esperándote.' },
  ],
  [
    {
      de: 'COCINERO',
      texto:
        'Hola! Te escribo porque me quedé sin uno de los ingredientes del plato que pediste.',
    },
    { de: 'CLIENTE', texto: 'Uy, qué lástima. ¿Tenés algo parecido?' },
    {
      de: 'COCINERO',
      texto:
        'Te puedo hacer la versión de verdura, misma cantidad y mismo precio.',
    },
    { de: 'CLIENTE', texto: 'Dale, va esa. Gracias por avisar.' },
  ],
  [
    {
      de: 'CLIENTE',
      texto:
        'Hola, me equivoqué con la cantidad. ¿Se puede cambiar a dos porciones?',
    },
    {
      de: 'COCINERO',
      texto:
        'Sí, todavía no lo empecé. Cancelalo y lo hacés de nuevo con la cantidad correcta.',
    },
    { de: 'CLIENTE', texto: 'Perfecto, ya lo hago.' },
  ],
  [
    { de: 'CLIENTE', texto: '¿Hacés entregas o es solo para retirar?' },
    {
      de: 'COCINERO',
      texto: 'Por ahora solo retiro en el domicilio que figura en el mapa.',
    },
    { de: 'CLIENTE', texto: 'Ok, me queda cerca igual. Gracias!' },
  ],
  [
    { de: 'CLIENTE', texto: 'Hola! Quedó riquísimo lo del sábado, gracias 🙌' },
    {
      de: 'COCINERO',
      texto: 'Me alegro un montón! Cualquier cosa me escribís.',
    },
  ],
];

/** Tickets de soporte de ejemplo (US-AYU-05). */
export interface SemillaTicket {
  /** `slug` del usuario que lo abre (ver datos/usuarios.ts). */
  autor: string;
  tipoConsulta: string;
  asunto: string;
  descripcion: string;
  estado: 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
  /**
   * Foto que el usuario adjunta al reclamo. `archivoLocal` es una ruta
   * relativa a `seed/imagenes/`; el tipo MIME y el tamano se leen del archivo
   * real al sembrar, para que `adjunto_ticket` no mienta sobre su contenido.
   */
  adjunto?: { nombre: string; archivoLocal: string };
}

export const TICKETS: readonly SemillaTicket[] = [
  {
    autor: 'sofia.ramirez',
    tipoConsulta: 'Problema con un pedido',
    asunto: 'El pedido llegó incompleto',
    descripcion:
      'Buenas. Pedí una docena de empanadas y me entregaron ocho. Adjunto la foto de lo que recibí. El cocinero no respondió el chat. ¿Se puede revisar?',
    estado: 'ABIERTO',
    adjunto: {
      nombre: 'lo-que-recibi.jpg',
      archivoLocal: 'platos/empanadas-carne.jpg',
    },
  },
  {
    autor: 'tomas.ibanez',
    tipoConsulta: 'Problema con mi cuenta',
    asunto: 'No me llega el correo de recuperación de contraseña',
    descripcion:
      'Pedí recuperar la contraseña tres veces y no me llegó nada, tampoco a spam. Mi correo es el mismo con el que me registré.',
    estado: 'EN_PROCESO',
  },
  {
    autor: 'valentina.correa',
    tipoConsulta: 'Problema con una publicación',
    asunto: 'El plato no se parece a la foto de la publicación',
    descripcion:
      'Pedí una lasaña que en la publicación se ve enorme y lo que recibí es la mitad. Adjunto la foto de lo que me entregaron para que lo comparen.',
    estado: 'CERRADO',
    adjunto: {
      nombre: 'lo-que-me-entregaron.jpg',
      archivoLocal: 'platos/lasana-carne.jpg',
    },
  },
  {
    autor: 'martin.aguirre',
    tipoConsulta: 'Sugerencia de mejora',
    asunto: 'Sería útil poder repetir un pedido anterior',
    descripcion:
      'Pido casi siempre lo mismo. Un botón de "volver a pedir" desde el historial me ahorraría varios pasos.',
    estado: 'ABIERTO',
  },
  {
    autor: 'julieta.ponce',
    tipoConsulta: 'Consulta general',
    asunto: '¿Cómo cambio el radio de búsqueda por defecto?',
    descripcion:
      'Cada vez que abro la app tengo que volver a ampliar el radio a 15 km. ¿Se puede dejar fijo?',
    estado: 'CERRADO',
  },
  {
    autor: 'gabriela.moyano',
    tipoConsulta: 'Problema con una publicación',
    asunto: 'No puedo subir la foto de un plato nuevo',
    descripcion:
      'Al cargar la foto me dice que la imagen no es válida. La saqué con el teléfono, pesa 4 MB y es JPG.',
    estado: 'EN_PROCESO',
    adjunto: {
      nombre: 'foto-que-quiero-subir.jpg',
      archivoLocal: 'platos/tarta-pascualina.jpg',
    },
  },
  {
    autor: 'federico.iglesias',
    tipoConsulta: 'Problema con un pedido',
    asunto: 'Pedidos que expiran sin que me llegue la notificación',
    descripcion:
      'Se me vencieron cuatro pedidos esta semana. Tengo las notificaciones activadas y no me llegó ninguna al teléfono.',
    estado: 'ABIERTO',
  },
  {
    autor: 'nahuel.guzman',
    tipoConsulta: 'Problema con mi cuenta',
    asunto: 'Quiero cambiar mi ubicación, me mudé',
    descripcion:
      'Me mudé de Luján al centro y no encuentro dónde cambiar el punto del mapa. ¿Me guían?',
    estado: 'CERRADO',
  },
  {
    autor: 'karina.ledesma',
    tipoConsulta: 'Sugerencia de mejora',
    asunto: 'Poder marcar días en los que no cocino',
    descripcion:
      'Me gustaría poder marcar los lunes y martes como días sin actividad para que no me entren pedidos y no se venzan solos.',
    estado: 'EN_PROCESO',
  },
  {
    autor: 'emiliano.sosa',
    tipoConsulta: 'Consulta general',
    asunto: '¿Se puede pagar por la aplicación?',
    descripcion:
      'Vi que el pago se arregla con cada cocinero. ¿Está previsto pagar dentro de la app más adelante?',
    estado: 'CERRADO',
  },
];

/** Motivos de reporte de una resena (`reporte_resena.motivos`). */
export const MOTIVOS_REPORTE_RESENA = [
  'Lenguaje ofensivo',
  'Spam o publicidad',
  'Información falsa',
  'No corresponde a este plato',
  'Datos personales de terceros',
] as const;

export const DETALLES_REPORTE_RESENA = [
  'La reseña insulta al cocinero, no habla del plato.',
  'Es la tercera vez que el mismo usuario deja el mismo texto en distintos platos.',
  'La persona nunca pidió este plato, dejó la reseña por error.',
  'Incluye el número de teléfono de otra persona.',
] as const;
