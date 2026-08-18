/**
 * Textos de interfaz de la app que NO están comprometidos por un criterio de
 * aceptación.
 *
 * QUÉ VA ACÁ Y QUÉ NO
 *
 *   NO va  todo mensaje que la documentación fija palabra por palabra. Esos
 *          viven en `@foodhub/shared` (MENSAJES_AUTH, MENSAJES_VALIDACION,
 *          MENSAJES_USUARIO, MENSAJES_ERROR) y se importan de ahí. Las pruebas
 *          funcionales de la Etapa 6 los verifican letra por letra.
 *   SÍ va  la copia transcrita de la maquetación que no es un mensaje de error
 *          (títulos de pantalla, bajadas, rótulos de campo, textos de botón) y
 *          los textos que la documentación no define y hubo que redactar para
 *          poder terminar una pantalla.
 *
 * Los redactados por el equipo quedan marcados con [PROPIO] para que la
 * revisión de la Etapa 6 los pueda distinguir de la maquetación y, si
 * corresponde, promoverlos a `@foodhub/shared`.
 *
 * Mismo criterio y misma estructura que `apps/admin/src/lib/textos.ts`.
 */

/** PAN-AUT-00 · Bienvenida. */
export const TEXTOS_BIENVENIDA = {
  titulo: 'Conectamos cocineros con vecinos',
  bajada: 'Comida casera de vecinos, hecha por gente real.',
  registrarseCliente: 'Registrarse como cliente',
  registrarseCocinero: 'Registrarse como cocinero',
  iniciarSesion: 'Iniciar sesión',
  /** [PROPIO] Etiqueta de la fila decorativa de platos, para lectores de pantalla. */
  chipsPlatos: 'Platos caseros de la comunidad',
} as const;

/** PAN-AUT-01 y PAN-AUT-02 · Registro. */
export const TEXTOS_REGISTRO = {
  tituloCliente: 'Crear cuenta de cliente',
  tituloCocinero: 'Crear cuenta de cocinero',
  bajadaCliente:
    'Completá tus datos para empezar a explorar platos cerca tuyo.',
  /**
   * Banner informativo del encabezado de PAN-AUT-02. La maquetación lo muestra
   * como aviso, no como bajada: por eso el registro de cocinero no repite la
   * bajada del de cliente.
   */
  avisoCocinero:
    'Como cocinero podrás publicar platos y recibir pedidos de clientes cercanos.',
  nombre: 'Nombre',
  apellido: 'Apellido',
  correo: 'Correo electrónico',
  correoPlaceholder: 'tu@correo.com',
  contrasena: 'Contraseña',
  confirmarContrasena: 'Confirmar contraseña',
  descripcion: 'Descripción de tu perfil',
  descripcionPlaceholder:
    'Contá qué cocinás, tu especialidad y hace cuánto cocinás.',
  ubicacion: 'Tu ubicación',
  fotoPerfil: 'Foto de perfil',
  opcional: '(opcional)',
  agregarFoto: 'Agregar foto',
  cambiarFoto: 'Cambiar foto',
  quitarFoto: 'Quitar foto',
  aceptoTerminos: 'Acepto los ',
  terminos: 'términos y condiciones',
  deFoodHub: ' de FoodHub',
  registrarse: 'Registrarse',
  /** [PROPIO] Estado del botón mientras se crea la cuenta. */
  registrando: 'Creando tu cuenta…',
  /**
   * [PROPIO] La cuenta ya se creó y solo falta entrar. Reemplaza a
   * "Registrarse" cuando la foto de perfil no se pudo subir: el alta no se
   * puede reintentar —chocaría contra su propio correo duplicado— y dejar el
   * botón original invitaría justamente a eso.
   */
  continuar: 'Continuar',
  /** [PROPIO] Estado del botón "Continuar": la cuenta ya existe, solo falta entrar. */
  entrando: 'Entrando…',
  /**
   * [PROPIO] La foto es OPCIONAL en US-AUT-01 y US-AUT-02, así que su fallo no
   * invalida el registro. El aviso dice las tres cosas que el usuario necesita
   * saber: que la cuenta existe, que la foto no quedó y dónde cargarla después.
   */
  fotoNoSubida:
    'Creamos tu cuenta, pero no pudimos subir tu foto. Podés cargarla más tarde desde Mi perfil.',
  yaTenesCuenta: '¿Ya tenés cuenta? ',
  iniciarSesion: 'Iniciar sesión',
} as const;

/** PAN-AUT-03 · Inicio de sesión. */
export const TEXTOS_LOGIN = {
  bienvenida: 'Bienvenido/a de nuevo',
  correo: 'Correo electrónico',
  correoPlaceholder: 'tu@correo.com',
  contrasena: 'Contraseña',
  contrasenaPlaceholder: 'Ingresá tu contraseña',
  olvidaste: '¿Olvidaste tu contraseña?',
  ingresar: 'Iniciar sesión',
  /** [PROPIO] Estado del botón mientras Supabase verifica las credenciales. */
  ingresando: 'Verificando…',
  sinCuenta: '¿No tenés cuenta? ',
  registrate: 'Registrate',
  mostrarContrasena: 'Mostrar contraseña',
  ocultarContrasena: 'Ocultar contraseña',
  /**
   * [PROPIO] Decisión del usuario: un administrador que inicia sesión en la app
   * queda fuera y se le explica dónde tiene que ir. La documentación define que
   * el panel es web (PAN-ADM-01) pero no fija el texto de este aviso.
   */
  soloPanelWeb:
    'La administración de FoodHub se opera desde el panel web. Ingresá desde una computadora con tu cuenta de administrador.',
} as const;

/** PAN-AUT-04 · Recuperar contraseña. */
export const TEXTOS_RECUPERAR = {
  titulo: 'Recuperar contraseña',
  encabezado: '¿Olvidaste tu contraseña?',
  bajada:
    'Ingresá tu correo y te enviaremos un enlace para que puedas crear una nueva contraseña.',
  correo: 'Correo electrónico',
  correoPlaceholder: 'tu@correo.com',
  enviar: 'Enviar enlace de recuperación',
  /** [PROPIO] Estado del botón mientras la API dispara el correo. */
  enviando: 'Enviando…',
  volverAlLogin: 'Volver al inicio de sesión',
} as const;

/** PAN-AUT-04.1 · Nueva contraseña (se abre desde el enlace del correo). */
export const TEXTOS_NUEVA_PASSWORD = {
  titulo: 'Nueva contraseña',
  encabezado: 'Creá tu nueva contraseña',
  bajada:
    'Ingresá y confirmá tu nueva contraseña para recuperar el acceso a tu cuenta.',
  nueva: 'Nueva contraseña',
  confirmar: 'Confirmar contraseña',
  guardar: 'Guardar nueva contraseña',
  /** [PROPIO] Estado del botón mientras Supabase actualiza la credencial. */
  guardando: 'Guardando…',
  /**
   * [PROPIO] Encabezado y bajada cuando el enlace es una invitación (US-GURP-06)
   * y no una recuperación.
   *
   * La maquetación fija los de arriba para PAN-AUT-04.1, que es la pantalla de
   * US-AUT-04, y ahí "tu nueva contraseña" y "recuperar el acceso a tu cuenta"
   * son correctos. A quien un administrador acaba de dar de alta no le sirven:
   * no tiene una contraseña anterior ni un acceso que recuperar. Es la misma
   * situación que ya resolvió el panel con textos propios.
   */
  encabezadoInvitacion: 'Creá tu contraseña',
  bajadaInvitacion:
    'Elegí la contraseña con la que vas a entrar a tu cuenta de FoodHub.',
  /**
   * [PROPIO] La pantalla se abrió sin token: el enlace venció, ya se usó o
   * alguien entró a la ruta a mano.
   *
   * No nombra la recuperación ni la invitación porque, sin tokens, tampoco se
   * puede saber cuál de las dos era. La salida que ofrece sirve para las dos: a
   * quien fue invitado, pedir la recuperación también le llega, porque su cuenta
   * ya existe desde que el administrador la creó.
   */
  enlaceInvalido:
    'Este enlace no es válido o ya venció. Los enlaces del correo se usan una sola vez: pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
  /** [PROPIO] Confirmación previa a volver al login. */
  listo: 'Actualizamos tu contraseña. Iniciá sesión con la nueva.',
  /** [PROPIO] La misma confirmación, sin dar por hecho que había una anterior. */
  listoInvitacion: 'Guardamos tu contraseña. Ya podés iniciar sesión.',
  pedirOtroEnlace: 'Pedir un enlace nuevo',
} as const;

/** PAN-AUT-05 · Diálogo de cierre de sesión. */
export const TEXTOS_CERRAR_SESION = {
  titulo: '¿Cerrar sesión?',
  bajada: 'Tendrás que ingresar tus datos de nuevo para acceder a tu cuenta.',
  confirmar: 'Cerrar sesión',
  cancelar: 'Cancelar',
} as const;

/** PAN-GURP-01 · Mi perfil. */
export const TEXTOS_PERFIL = {
  titulo: 'Mi perfil',
  ajustes: 'Ajustes',
  cambiarFoto: 'Cambiar foto de perfil',
  cocineroVerificado: 'COCINERO VERIFICADO',
  metricaPlatos: 'PLATOS',
  metricaRating: 'RATING',
  metricaPedidos: 'PEDIDOS',
  informacion: 'Información del perfil',
  nombre: 'Nombre',
  apellido: 'Apellido',
  descripcionPublica: 'Descripción pública',
  guardar: 'Guardar cambios',
  /** [PROPIO] Estado del botón mientras se envía el PATCH. */
  guardando: 'Guardando…',
  cambiarContrasena: 'Cambiar contraseña',
  configurarNotificaciones: 'Configurar notificaciones',
  cerrarSesion: 'Cerrar sesión',
  eliminarCuenta: 'Eliminar cuenta',
  contrasenaActual: 'Contraseña actual',
  contrasenaNueva: 'Nueva contraseña',
  contrasenaConfirmar: 'Confirmar nueva contraseña',
  actualizarContrasena: 'Actualizar contraseña',
  /** [PROPIO] Título del diálogo severo de baja de cuenta (US-GURP-04). */
  tituloEliminarCuenta: '¿Eliminar tu cuenta?',
  confirmarEliminar: 'Eliminar mi cuenta',
  cancelar: 'Cancelar',
  reintentar: 'Reintentar',
} as const;

/** Textos del shell de navegación (barras de tabs y header). */
export const TEXTOS_NAVEGACION = {
  inicio: 'Inicio',
  mapa: 'Mapa',
  pedidos: 'Pedidos',
  mensajes: 'Mensajes',
  perfil: 'Perfil',
  platos: 'Platos',
  /**
   * PAN-DASH-01 se llama "Mi actividad". En la barra entra como "Actividad" y
   * usa el ícono `clock`: la guía visual no tiene ícono de gráfico y no se
   * inventa uno.
   */
  actividad: 'Actividad',
  notificaciones: 'Notificaciones',
  volver: 'Volver',
} as const;

/** Selector de ubicación de PAN-AUT-02 (US-AUT-02, ubicación obligatoria). */
export const TEXTOS_UBICACION = {
  detectando: 'Detectando tu ubicación…',
  detectada: 'Arrastrá el mapa para ajustar tu ubicación exacta.',
  usarMiUbicacion: 'Usar mi ubicación',
  reintentar: 'Reintentar',
  /**
   * [PROPIO] El permiso fue denegado. El criterio de aceptación pide la
   * ubicación detectada por GPS pero no define qué mostrar si el usuario dice
   * que no; se explica para qué se usa y se ofrece volver a pedirla.
   */
  permisoDenegado:
    'Necesitamos tu ubicación para que los vecinos puedan encontrarte. Sin ella no podemos crear tu cuenta de cocinero.',
  /** [PROPIO] El GPS está apagado o no devolvió una posición. */
  sinPosicion:
    'No pudimos obtener tu ubicación. Revisá que el GPS esté encendido e intentá de nuevo.',
  etiquetaMapa: 'Mapa con tu ubicación',
} as const;

/** Selector de foto de perfil (US-AUT-01, US-GURP-02). */
export const TEXTOS_FOTO = {
  /** [PROPIO] El usuario negó el acceso a la galería. */
  permisoDenegado:
    'Necesitamos acceso a tus fotos para que puedas elegir una imagen de perfil.',
  /** [PROPIO] El usuario negó el acceso a la cámara. */
  permisoCamaraDenegado:
    'Necesitamos acceso a tu cámara para que puedas tomar la foto de perfil.',
  vistaPrevia: 'Vista previa de la foto de perfil',
  /**
   * [PROPIO] Elección de origen de la imagen. El criterio de aceptación de
   * US-AUT-01 y US-AUT-02 no define el mecanismo, así que se reutiliza el texto
   * literal que sí fija US-MSG-04 para el mismo dilema (adjuntar imagen en el
   * chat): "Tomar foto" / "Elegir de la galería".
   */
  elegirOrigen: 'Elegir origen de la foto',
  tomarFoto: 'Tomar foto',
  elegirDeGaleria: 'Elegir de la galería',
} as const;

/**
 * PAN-PUB-01 · Mis publicaciones (US-PUB-05).
 *
 * Los mensajes de validación, los modales de confirmación y los estados
 * vacíos del listado son literales de los criterios de aceptación y viven en
 * `MENSAJES_PUBLICACION` (`@foodhub/shared`), no acá. Lo que sigue es el resto
 * de la copia de la pantalla: título, rótulos de filtro y opciones del
 * desplegable "Ordenar por", todos transcritos de la tabla de criterios de
 * `MOD_PUBLICACIONES.md`.
 */
export const TEXTOS_PUBLICACIONES = {
  titulo: 'Mis publicaciones',
  nuevaPublicacion: 'Nueva publicación',
  /** [PROPIO] La documentación no fija el texto del placeholder de búsqueda. */
  buscarPlaceholder: 'Buscar en tus publicaciones',
  /** [PROPIO] Título de la hoja de filtros y etiqueta accesible de su ícono. */
  filtros: 'Filtros',
  categoria: 'Categoría',
  disponibilidad: 'Estado de disponibilidad',
  estadoDisponible: 'Disponible',
  estadoUltimasUnidades: 'Últimas unidades',
  estadoNoDisponible: 'No disponible',
  /**
   * [PROPIO] US-PUB-04, último criterio de "No disponible": la tarjeta debe
   * llevar, además del selector, "una etiqueta de 'Sin unidades' o
   * 'Agotado'". El propio criterio ofrece las dos opciones sin fijar una; se
   * elige "Sin unidades" por ser la más consistente con el resto de las
   * etiquetas del módulo (no dramatiza la ausencia de stock).
   */
  sinUnidades: 'Sin unidades',
  rangoDePrecio: 'Rango de precio',
  /** [PROPIO] Etiquetas de los dos campos del rango de precio. */
  precioMinimo: 'Mínimo',
  precioMaximo: 'Máximo',
  aplicarFiltros: 'Aplicar filtros',
  ordenarPor: 'Ordenar por',
  ordenRecientes: 'Más recientes',
  ordenNombre: 'Nombre (A-Z)',
  ordenPrecioAsc: 'Precio (ascendente)',
  ordenPrecioDesc: 'Precio (descendente)',
  ordenMasPedidos: 'Más pedidos',
  /** [PROPIO] Cantidad de pedidos completados de la tarjeta y el detalle. */
  pedidosRecibidos: (cantidad: number) =>
    `${String(cantidad)} pedido${cantidad === 1 ? '' : 's'}`,
  editar: 'Editar',
  eliminar: 'Eliminar',
  /** [PROPIO] Sección de datos del detalle. */
  descripcion: 'Descripción',
  tiempoEstimado: 'Tiempo estimado de preparación',
  tiempoEstimadoMinutos: (minutos: number) => `${String(minutos)} min`,
  publicadoEl: (fecha: string) => `Publicado el ${fecha}`,
  editadoEl: (fecha: string) => `Editado el ${fecha}`,
  /** [PROPIO] Paginación del listado (RNF002). */
  pagina: (actual: number, total: number) =>
    `Página ${String(actual)} de ${String(total)}`,
  paginaAnterior: 'Página anterior',
  paginaSiguiente: 'Página siguiente',

  /**
   * Formulario de alta/edición de un plato (US-PUB-01, PAN-PUB-02). Los
   * rótulos de "Descripción", "Categoría" y "Tiempo estimado de preparación"
   * reusan las claves homónimas que ya existen más arriba en este mismo
   * bloque -son, letra por letra, la misma etiqueta que ya usan el detalle y
   * la hoja de filtros- así que no se repiten acá.
   */
  publicar: 'Publicar',
  cancelar: 'Cancelar',
  campoNombre: 'Nombre del plato',
  campoPrecio: 'Precio',
  campoImagen: 'Imagen del plato',
  /** [PROPIO] Placeholder del desplegable de categoría sin selección. */
  categoriaPlaceholder: 'Seleccioná una categoría',
  /**
   * [PROPIO] La categoría es obligatoria y no hay forma de publicar sin
   * elegir una. Sin categorías cargadas el desplegable queda sin opciones y
   * el botón "Publicar" permanece deshabilitado (falta un campo obligatorio),
   * pero eso solo, sin este aviso, es indistinguible de un formulario recién
   * abierto: el cocinero no tiene forma de saber por qué no puede avanzar.
   */
  sinCategorias:
    'Todavía no hay categorías cargadas. Contactá al soporte para poder publicar un plato.',
  /** [PROPIO] Reusados también por `SelectorDeFoto` en la foto del plato. */
  agregarFoto: 'Agregar foto',
  cambiarFoto: 'Cambiar foto',
  /** [PROPIO] Botón único de `DialogoExito`. */
  aceptar: 'Aceptar',

  /**
   * Edición de un plato (US-PUB-02, PAN-PUB-03). El título de la pantalla no
   * está fijado por un criterio de aceptación -se redacta análogo a
   * `nuevaPublicacion`, más arriba-; el resto es la copia transcrita del
   * criterio de aceptación (botón "Guardar cambios" y botón "Quitar imagen").
   */
  /** [PROPIO] Título de la pantalla de edición. */
  editarPublicacion: 'Editar publicación',
  guardarCambios: 'Guardar cambios',
  quitarImagen: 'Quitar imagen',
} as const;

/**
 * Re-aceptación obligatoria de términos y condiciones y política de
 * privacidad (US-CFG-04, RF058, último criterio de aceptación).
 *
 * El checkbox y el botón "Continuar" son literales del criterio; el resto —
 * título y bajada de la pantalla— es [PROPIO]: el criterio pide "una pantalla
 * con el texto actualizado" pero no fija esas palabras.
 */
export const TEXTOS_ACEPTAR_TERMINOS = {
  /** [PROPIO] */
  titulo: 'Términos y condiciones',
  /** [PROPIO] */
  bajada:
    'Actualizamos nuestros términos y condiciones y nuestra política de privacidad. Leé el contenido antes de continuar.',
  /** [PROPIO] Encabezado de cada documento dentro del scroll. */
  solapaTerminos: 'Términos y condiciones',
  /** [PROPIO] Encabezado de cada documento dentro del scroll. */
  solapaPrivacidad: 'Política de privacidad',
  continuar: 'Continuar',
  /** [PROPIO] Estado del botón mientras se registra la aceptación. */
  continuando: 'Continuando…',
} as const;

/**
 * Preferencias de notificación push (US-CFG-05, RF059, PAN-CFG-01).
 *
 * Las etiquetas de los switches y el texto del tooltip son literales de la
 * tabla de criterios de aceptación. "Cambios de estado de..." tiene una
 * redacción distinta para cliente y cocinero aunque controle el mismo grupo
 * de tipos de notificación (`CAMBIO_ESTADO_PEDIDO`); por eso hay dos objetos
 * de etiquetas y no uno solo indexado por grupo.
 *
 * "Publicaciones nuevas de cocineros favoritos" queda deliberadamente afuera:
 * no hay un `TIPO_NOTIFICACION` para ese evento todavía. Ver
 * `PENDIENTE_NOTIFICACIONES_COCINEROS_FAVORITOS.md` en la raíz del repo.
 */
export const TEXTOS_PREFERENCIAS_NOTIFICACION = {
  /** [PROPIO] */
  titulo: 'Notificaciones',
  etiquetasCliente: {
    CAMBIO_ESTADO_PEDIDO: 'Cambios de estado de mis pedidos',
    MENSAJE_NUEVO: 'Mensajes nuevos en el chat',
    AVISO_SISTEMA: 'Avisos generales del sistema',
  },
  etiquetasCocinero: {
    PEDIDO_CREADO: 'Nuevos pedidos recibidos',
    CAMBIO_ESTADO_PEDIDO: 'Cambios de estado de pedidos asociados a mí',
    MENSAJE_NUEVO: 'Mensajes nuevos en el chat',
    RESENA_RECIBIDA: 'Nuevas reseñas recibidas',
    PUBLICACION_ELIMINADA_ADMIN:
      'Eliminación de publicaciones por parte del administrador',
    AVISO_SISTEMA: 'Avisos generales del sistema',
  },
} as const;

/**
 * Pantallas todavía no codificadas.
 *
 * Cada una anuncia su código PAN, su módulo y qué va a hacer: un placeholder
 * que solo dice "próximamente" no le sirve ni al usuario ni a quien revisa el
 * avance del sprint.
 */
export const TEXTOS_PENDIENTE = {
  etiqueta: 'EN CONSTRUCCIÓN',
  /** [PROPIO] Aclaración común a todas las pantallas pendientes. */
  nota: 'Esta pantalla se codifica en un sprint posterior.',
} as const;

/**
 * Ficha de cada pantalla todavía no codificada: su código PAN, su módulo y una
 * línea sobre qué va a hacer.
 *
 * [PROPIO] Las descripciones están redactadas por el equipo a partir del
 * alcance de cada módulo; la maquetación no fija un texto para el estado
 * "pendiente" porque en la Etapa 5 todas las pantallas se dibujan terminadas.
 */
export const PANTALLAS_PENDIENTES = {
  feed: {
    codigo: 'PAN-EXP-01',
    modulo: 'Exploración y búsqueda',
    titulo: 'Inicio',
    descripcion:
      'El feed de platos cerca tuyo, con buscador, chips de categoría y las publicaciones disponibles ordenadas por cercanía.',
  },
  mapa: {
    codigo: 'PAN-EXP-02',
    modulo: 'Exploración y búsqueda',
    titulo: 'Mapa',
    descripcion:
      'El mapa de cocineros de tu zona, con su distancia y el acceso a su perfil público.',
  },
  pedidosCliente: {
    codigo: 'PAN-PED-05',
    modulo: 'Pedidos',
    titulo: 'Pedidos',
    descripcion:
      'Tus pedidos activos y tu historial, con el seguimiento de cada uno hasta que lo retirás.',
  },
  mensajes: {
    codigo: 'PAN-MSG-01',
    modulo: 'Mensajería directa',
    titulo: 'Mensajes',
    descripcion:
      'Tus conversaciones con la otra parte de cada pedido, con el último mensaje y los no leídos.',
  },
  pedidosCocinero: {
    codigo: 'PAN-PED-04',
    modulo: 'Pedidos',
    titulo: 'Pedidos',
    descripcion:
      'La bandeja de pedidos que te llegan, separada en nuevos, preparando, listos y completados.',
  },
  actividad: {
    codigo: 'PAN-DASH-01',
    modulo: 'Dashboard del cocinero',
    titulo: 'Mi actividad',
    descripcion:
      'Tus métricas propias: pedidos del período, calificación promedio y platos más pedidos.',
  },
  notificaciones: {
    codigo: 'PAN-NOT-01',
    modulo: 'Notificaciones y alertas',
    titulo: 'Notificaciones',
    descripcion:
      'El historial de avisos de la aplicación: cambios de estado de tus pedidos, mensajes nuevos y reseñas recibidas.',
  },
} as const;
