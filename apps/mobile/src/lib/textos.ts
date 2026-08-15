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
   * [PROPIO] La pantalla se abrió sin token: el enlace venció, ya se usó o
   * alguien entró a la ruta a mano.
   */
  enlaceInvalido:
    'Este enlace no es válido o ya venció. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
  /** [PROPIO] Confirmación previa a volver al login. */
  listo: 'Actualizamos tu contraseña. Iniciá sesión con la nueva.',
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
  platos: {
    codigo: 'PAN-PUB-01',
    modulo: 'Publicaciones',
    titulo: 'Mis platos',
    descripcion:
      'Tus publicaciones, su disponibilidad y el alta, edición y baja de cada plato.',
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
