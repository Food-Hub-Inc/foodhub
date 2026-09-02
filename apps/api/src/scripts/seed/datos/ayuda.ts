/**
 * Contenido del Modulo de ayuda y soporte (alcance 2.2.2.2.3).
 *
 * Los capitulos y las secciones son ABM del administrador (US-AYU-01,
 * US-AYU-02): la documentacion define la estructura -capitulo, seccion, rol
 * destino y orden- pero no el texto. Lo que sigue es contenido de ejemplo
 * consistente con el comportamiento real del sistema, para que el manual
 * dentro de la app no quede vacio despues de un reset.
 *
 * Las FAQ del rol CLIENTE y COCINERO reproducen las que siembra la migracion
 * 0002 y agregan algunas mas: el reset trunca la tabla y esa migracion ya
 * figura aplicada, de modo que no vuelve a correr.
 */

export interface SemillaSeccionAyuda {
  titulo: string;
  contenidoHtml: string;
  habilitado: boolean;
}

export interface SemillaCapituloAyuda {
  titulo: string;
  rol: 'CLIENTE' | 'COCINERO';
  activo: boolean;
  secciones: SemillaSeccionAyuda[];
}

const p = (...parrafos: string[]): string =>
  parrafos.map((texto) => `<p>${texto}</p>`).join('');

export const CAPITULOS_AYUDA: readonly SemillaCapituloAyuda[] = [
  {
    titulo: 'Primeros pasos',
    rol: 'CLIENTE',
    activo: true,
    secciones: [
      {
        titulo: 'Crear tu cuenta',
        habilitado: true,
        contenidoHtml: p(
          'Desde la pantalla de bienvenida elegí <strong>Registrarme como cliente</strong>. Vas a necesitar tu nombre, tu apellido, un correo electrónico válido y una contraseña de al menos ocho caracteres con una mayúscula, una minúscula y un número.',
          'Antes de confirmar tenés que aceptar los términos y condiciones. Queda registrada la fecha y la versión exacta que aceptaste.',
        ),
      },
      {
        titulo: 'Completar tu perfil',
        habilitado: true,
        contenidoHtml: p(
          'Desde <strong>Mi perfil</strong> podés cambiar tu foto, tu nombre y tu apellido. La foto se recorta en cuadrado y no puede pesar más de 5 MB.',
          'El correo electrónico no se edita desde la aplicación: es el que identifica tu cuenta.',
        ),
      },
      {
        titulo: 'Configurar tu ubicación',
        habilitado: true,
        contenidoHtml: p(
          'La ubicación es opcional para el cliente, pero sin ella el feed no puede ordenar las publicaciones por cercanía y vas a ver a todos los cocineros por igual.',
          'Podés fijarla arrastrando el marcador en el mapa. Se guarda solo el punto, no tu dirección exacta.',
        ),
      },
    ],
  },
  {
    titulo: 'Explorar y pedir',
    rol: 'CLIENTE',
    activo: true,
    secciones: [
      {
        titulo: 'Buscar cocineros cerca tuyo',
        habilitado: true,
        contenidoHtml: p(
          'El feed muestra por defecto las publicaciones dentro de un radio de 5 km de tu ubicación. Podés ampliarlo desde los filtros hasta el máximo que fije la plataforma.',
          'La vista de mapa muestra los mismos resultados posicionados sobre el Gran Mendoza.',
        ),
      },
      {
        titulo: 'Filtrar y ordenar el feed',
        habilitado: true,
        contenidoHtml: p(
          'Podés filtrar por categoría, por rango de precio, por valoración mínima y por distancia; y ordenar por cercanía, por precio o por valoración.',
          'Los filtros se combinan entre sí y quedan visibles como etiquetas arriba del listado para que sepas por qué estás viendo esos resultados.',
        ),
      },
      {
        titulo: 'Armar el carrito',
        habilitado: true,
        contenidoHtml: p(
          'Un pedido no puede mezclar platos de cocineros distintos. Si agregás un plato de otro cocinero, la aplicación te pregunta si querés vaciar el carrito y empezar uno nuevo.',
          'El carrito guarda el precio con el que agregaste cada plato. Si el cocinero lo modifica antes de que confirmes, te avisamos.',
        ),
      },
      {
        titulo: 'Confirmar un pedido',
        habilitado: true,
        contenidoHtml: p(
          'Al confirmar podés dejar instrucciones para el cocinero (por ejemplo, sin sal o para retirar a las 21). El pedido queda en estado <strong>Creado</strong> y el cocinero recibe una notificación.',
          'Cada pedido tiene un número visible con el formato FH-00000 que sirve para identificarlo en el chat y ante soporte.',
        ),
      },
    ],
  },
  {
    titulo: 'Seguimiento del pedido',
    rol: 'CLIENTE',
    activo: true,
    secciones: [
      {
        titulo: 'Los estados de un pedido',
        habilitado: true,
        contenidoHtml: p(
          '<strong>Creado</strong>: esperando que el cocinero lo acepte. <strong>Aceptado</strong>: está en preparación. <strong>Listo</strong>: podés pasar a retirarlo. <strong>Completado</strong>: se entregó. <strong>Rechazado</strong>: no se concretó.',
          'En el detalle del pedido vas a ver el historial completo con la fecha de cada cambio y quién lo hizo.',
        ),
      },
      {
        titulo: 'Cancelar un pedido',
        habilitado: true,
        contenidoHtml: p(
          'Podés cancelar mientras el pedido siga en estado <strong>Creado</strong>, dentro de la ventana de minutos que fija la plataforma. Podés elegir un motivo de la lista o dejarlo en blanco.',
          'Una vez que el cocinero lo aceptó, la cancelación se coordina por el chat.',
        ),
      },
      {
        titulo: 'Chatear con el cocinero',
        habilitado: true,
        contenidoHtml: p(
          'Cada pedido habilita una conversación con el cocinero. Podés mandar texto e imágenes de hasta 8 MB.',
          'Si alguna de las dos partes da de baja su cuenta, la conversación queda visible pero no se pueden enviar mensajes nuevos.',
        ),
      },
    ],
  },
  {
    titulo: 'Reseñas y favoritos',
    rol: 'CLIENTE',
    activo: true,
    secciones: [
      {
        titulo: 'Dejar una reseña',
        habilitado: true,
        contenidoHtml: p(
          'Podés reseñar un plato que hayas recibido en un pedido completado, dentro del plazo de días que fija la plataforma. La reseña es <strong>por plato</strong>, no por pedido.',
          'Se compone de una calificación de 1 a 5 estrellas, un comentario opcional, etiquetas rápidas y, si querés, una foto.',
        ),
      },
      {
        titulo: 'Editar o eliminar tu reseña',
        habilitado: true,
        contenidoHtml: p(
          'Si volvés a pedir el mismo plato, editás la reseña que ya tenías en lugar de crear una nueva. La reseña editada queda marcada como tal.',
          'También podés eliminarla: deja de mostrarse y de contar para el promedio del plato.',
        ),
      },
      {
        titulo: 'Guardar favoritos',
        habilitado: true,
        contenidoHtml: p(
          'Podés marcar como favorito un plato o un cocinero completo. Los encontrás agrupados en la sección <strong>Favoritos</strong>.',
          'Si seguís a un cocinero, recibís un aviso cuando publica algo nuevo.',
        ),
      },
    ],
  },
  {
    titulo: 'Tu cuenta',
    rol: 'CLIENTE',
    activo: true,
    secciones: [
      {
        titulo: 'Notificaciones',
        habilitado: true,
        contenidoHtml: p(
          'Desde <strong>Configuración → Notificaciones</strong> podés apagar los avisos que no te interesen.',
          'Algunos avisos son esenciales y no se pueden desactivar: aparecen con el interruptor deshabilitado para que sepas que existen.',
        ),
      },
      {
        titulo: 'Suspensión y baja de cuenta',
        habilitado: true,
        contenidoHtml: p(
          'Si un administrador suspende tu cuenta, al intentar entrar vas a ver el motivo y el contacto de soporte.',
          'La baja voluntaria la pedís desde tu perfil. Tu historial de pedidos se conserva para resolver reclamos, pero tu perfil deja de ser visible.',
        ),
      },
      {
        titulo: 'Programa de referidos',
        habilitado: false,
        contenidoHtml: p(
          'Sección deshabilitada: la funcionalidad todavía no está disponible en la plataforma.',
        ),
      },
    ],
  },
  {
    titulo: 'Primeros pasos',
    rol: 'COCINERO',
    activo: true,
    secciones: [
      {
        titulo: 'Crear tu cuenta de cocinero',
        habilitado: true,
        contenidoHtml: p(
          'Elegí <strong>Registrarme como cocinero</strong>. Además de los datos personales, vas a tener que fijar tu ubicación en el mapa: es obligatoria.',
          'Sin ubicación tus publicaciones no aparecen en el feed por cercanía ni en el mapa, y ningún cliente puede encontrarte.',
        ),
      },
      {
        titulo: 'Tu descripción pública',
        habilitado: true,
        contenidoHtml: p(
          'La descripción pública es lo primero que lee un cliente en tu perfil. Tenés hasta 500 caracteres para contar qué cocinás y cómo trabajás.',
          'Se edita desde <strong>Mi perfil</strong> en cualquier momento.',
        ),
      },
      {
        titulo: 'Cambiar tu ubicación',
        habilitado: true,
        contenidoHtml: p(
          'Si te mudás, actualizá el punto en el mapa desde tu perfil. El feed de los clientes empieza a usar la ubicación nueva de inmediato.',
        ),
      },
    ],
  },
  {
    titulo: 'Publicaciones',
    rol: 'COCINERO',
    activo: true,
    secciones: [
      {
        titulo: 'Publicar un plato',
        habilitado: true,
        contenidoHtml: p(
          'Desde <strong>Mis publicaciones → Nueva publicación</strong> cargás nombre, descripción, categoría, precio, tiempo estimado de preparación y una foto de hasta 5 MB.',
          'La foto se sube directo desde tu teléfono al almacenamiento de la plataforma; no pasa por nuestros servidores.',
        ),
      },
      {
        titulo: 'Editar, pausar y dar de baja',
        habilitado: true,
        contenidoHtml: p(
          'Podés editar cualquier dato de una publicación. Los pedidos ya confirmados conservan el precio y el nombre con el que se hicieron: editar un plato nunca cambia el importe de un pedido cerrado.',
          'Dar de baja una publicación la saca del feed pero no la borra, para que tu historial y el de tus clientes siga siendo consultable.',
        ),
      },
      {
        titulo: 'Estados de disponibilidad',
        habilitado: true,
        contenidoHtml: p(
          '<strong>Disponible</strong>: se puede pedir. <strong>Últimas unidades</strong>: se muestra con un aviso al cliente. <strong>No disponible</strong>: sigue visible en tu perfil pero no se puede agregar al carrito.',
          'Usá "No disponible" en lugar de dar de baja cuando el plato vuelve la semana que viene.',
        ),
      },
    ],
  },
  {
    titulo: 'Gestión de pedidos',
    rol: 'COCINERO',
    activo: true,
    secciones: [
      {
        titulo: 'Aceptar o rechazar un pedido',
        habilitado: true,
        contenidoHtml: p(
          'Cuando llega un pedido nuevo recibís una notificación y lo ves en la bandeja en estado <strong>Creado</strong>. Podés aceptarlo indicando un tiempo estimado, o rechazarlo.',
          'Al rechazar tenés que indicar un motivo: podés elegirlo de la lista o escribirlo. El cliente ve ese motivo en su historial.',
        ),
      },
      {
        titulo: 'Marcar listo y completar',
        habilitado: true,
        contenidoHtml: p(
          'Cuando terminás de cocinar, marcá el pedido como <strong>Listo</strong>: el cliente recibe el aviso de que puede pasar a retirarlo.',
          'Una vez entregado, marcalo como <strong>Completado</strong>. Recién a partir de ahí el cliente puede dejar una reseña de los platos que pidió.',
        ),
      },
      {
        titulo: 'Expiración automática',
        habilitado: true,
        contenidoHtml: p(
          'Un pedido que queda en <strong>Creado</strong> más tiempo del que fija la plataforma pasa a rechazado automáticamente, sin intervención tuya ni del cliente.',
          'Aparece en tu historial con origen <strong>Sistema</strong> y sin motivo. Si te pasa seguido, revisá que tengas las notificaciones activadas.',
        ),
      },
    ],
  },
  {
    titulo: 'Reputación',
    rol: 'COCINERO',
    activo: true,
    secciones: [
      {
        titulo: 'Cómo se calcula tu valoración',
        habilitado: true,
        contenidoHtml: p(
          'Tu valoración pública es el promedio de las reseñas visibles de todos tus platos. Necesitás un mínimo de reseñas para que se muestre; por debajo de ese número el perfil dice "Sin valoraciones suficientes".',
          'Cada plato tiene además su propio promedio, visible en su detalle.',
        ),
      },
      {
        titulo: 'Responder una reseña',
        habilitado: true,
        contenidoHtml: p(
          'Podés responder una vez a cada reseña. La respuesta aparece debajo, firmada con tu nombre.',
          'Pasada la ventana de edición la respuesta se congela: no se puede modificar después de que el cliente la leyó.',
        ),
      },
      {
        titulo: 'Calificar a un cliente',
        habilitado: true,
        contenidoHtml: p(
          'La reputación es en las dos direcciones: podés calificar a un cliente con el que hayas tenido al menos un pedido aceptado.',
          'Hay una sola calificación por cliente, que se edita si cambiás de opinión. Esa calificación no es pública: la ven los cocineros, no el cliente.',
        ),
      },
    ],
  },
  {
    titulo: 'Dashboard',
    rol: 'COCINERO',
    activo: true,
    secciones: [
      {
        titulo: 'Qué muestra el dashboard',
        habilitado: true,
        contenidoHtml: p(
          'El dashboard resume tu actividad del período elegido: pedidos recibidos, completados y rechazados, monto vendido, valoración promedio y platos más pedidos.',
          'Podés elegir hoy, los últimos 7 días, los últimos 30 días o un rango a medida.',
        ),
      },
      {
        titulo: 'Exportar tus datos',
        habilitado: true,
        contenidoHtml: p(
          'Desde el dashboard podés descargar el detalle del período en CSV o PDF para llevar tu propia contabilidad.',
        ),
      },
    ],
  },
];

export interface SemillaFaq {
  pregunta: string;
  respuesta: string;
  categoria: string;
  rol: 'CLIENTE' | 'COCINERO';
}

export const FAQ: readonly SemillaFaq[] = [
  // Las cinco del rol CLIENTE que siembra la migracion 0002.
  {
    pregunta: '¿Cómo creo mi cuenta?',
    respuesta:
      'Completá tus datos de registro y confirmá tu correo electrónico para comenzar a usar FoodHub.',
    categoria: 'Cuenta y registro',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Cómo hago un pedido?',
    respuesta:
      'Elegí un plato disponible, agregalo a tu carrito y confirmá el pedido con el cocinero.',
    categoria: 'Pedidos',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Dónde dejo una reseña?',
    respuesta:
      'Cuando el pedido esté completado vas a poder calificar la experiencia desde el detalle del pedido.',
    categoria: 'Reseñas y calificaciones',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Cómo contacto al cocinero?',
    respuesta: 'Podés escribirle desde la conversación asociada a tu pedido.',
    categoria: 'Mensajería',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Cómo protege FoodHub mis datos?',
    respuesta:
      'Tratamos tus datos de acuerdo con nuestra política de privacidad y protegemos el acceso a tu cuenta.',
    categoria: 'Privacidad y seguridad',
    rol: 'CLIENTE',
  },
  // Agregadas por la seed.
  {
    pregunta: '¿Puedo pedir platos de dos cocineros en el mismo pedido?',
    respuesta:
      'No. Cada pedido es de un solo cocinero. Si agregás un plato de otro, la aplicación te ofrece vaciar el carrito y empezar uno nuevo.',
    categoria: 'Pedidos',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Hasta cuándo puedo cancelar un pedido?',
    respuesta:
      'Mientras siga en estado "Creado" y dentro de la ventana de minutos que fija la plataforma. Después, coordinalo con el cocinero por el chat.',
    categoria: 'Pedidos',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Por qué no veo cocineros en el feed?',
    respuesta:
      'Puede que no tengas ubicación configurada o que el radio de búsqueda sea muy chico. Ampliá el radio desde los filtros.',
    categoria: 'Exploración',
    rol: 'CLIENTE',
  },
  {
    pregunta: '¿Puedo cambiar mi correo electrónico?',
    respuesta:
      'No desde la aplicación: el correo identifica tu cuenta. Escribinos por el canal de soporte si necesitás cambiarlo.',
    categoria: 'Cuenta y registro',
    rol: 'CLIENTE',
  },
  // Las seis del rol COCINERO que siembra la migracion 0002.
  {
    pregunta: '¿Cómo creo mi cuenta de cocinero?',
    respuesta:
      'Completá el registro como cocinero, agregá tu ubicación y confirmá tu correo electrónico.',
    categoria: 'Cuenta y registro',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Cómo publico un plato?',
    respuesta:
      'Desde Mis publicaciones elegí Nueva publicación, completá los datos del plato y confirmá la publicación.',
    categoria: 'Publicaciones',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Cómo gestiono un pedido nuevo?',
    respuesta:
      'Revisá los detalles del pedido y aceptalo o rechazalo desde la bandeja de pedidos.',
    categoria: 'Gestión de pedidos',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Cómo mejoro mi reputación?',
    respuesta:
      'Brindá una buena experiencia y respondé a las reseñas de tus clientes desde la sección correspondiente.',
    categoria: 'Reseñas y reputación',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Qué información muestra mi dashboard?',
    respuesta:
      'El dashboard resume tu actividad, pedidos, ventas y valoración durante el período seleccionado.',
    categoria: 'Dashboard',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Cómo protege FoodHub mis datos?',
    respuesta:
      'Tratamos tus datos de acuerdo con nuestra política de privacidad y protegemos el acceso a tu cuenta.',
    categoria: 'Privacidad y seguridad',
    rol: 'COCINERO',
  },
  // Agregadas por la seed.
  {
    pregunta: '¿Qué pasa si no respondo un pedido a tiempo?',
    respuesta:
      'El pedido se rechaza solo, con origen "Sistema" y sin motivo. Revisá que tengas las notificaciones activadas.',
    categoria: 'Gestión de pedidos',
    rol: 'COCINERO',
  },
  {
    pregunta:
      'Si edito el precio de un plato, ¿cambia el de los pedidos anteriores?',
    respuesta:
      'No. Cada pedido guarda el precio y el nombre del plato tal como estaban al confirmarlo.',
    categoria: 'Publicaciones',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Cuál es la diferencia entre "No disponible" y dar de baja?',
    respuesta:
      '"No disponible" es temporal: el plato sigue en tu perfil pero no se puede pedir. Dar de baja lo saca del feed de forma definitiva, conservando el historial.',
    categoria: 'Publicaciones',
    rol: 'COCINERO',
  },
  {
    pregunta: '¿Por qué mi perfil no muestra la valoración promedio?',
    respuesta:
      'Porque todavía no llegaste al mínimo de reseñas que exige la plataforma para publicarla.',
    categoria: 'Reseñas y reputación',
    rol: 'COCINERO',
  },
];
