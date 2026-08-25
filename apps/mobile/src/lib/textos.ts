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

/** US-AYU-02 · Hub y pantalla de preguntas frecuentes. */
export const TEXTOS_AYUDA = {
  titulo: 'Ayuda y soporte',
  preguntasFrecuentes: 'Preguntas frecuentes',
  manual: 'Manual de usuario',
  contacto: 'Contactar al soporte',
  legal: 'Información legal',
  buscar: 'Buscar preguntas',
  buscarPlaceholder: 'Escribí una palabra o frase',
  sinPreguntasTitulo: 'Todavía no hay preguntas frecuentes',
  sinPreguntasSubtitulo:
    'Estamos preparando contenido de ayuda para resolver tus dudas.',
  manualPendiente:
    'El manual reúne instrucciones paso a paso para usar FoodHub según tu rol.',
  contactoPendiente:
    'El formulario permite enviar una consulta, sugerencia o reporte al equipo.',
  legalPendiente:
    'Esta sección reúne los términos, condiciones y datos de contacto de FoodHub.',
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
 * Módulo de Exploración y búsqueda (US-EXP-01 a US-EXP-07) · PAN-EXP-01 a
 * PAN-EXP-05 y PAN-PED-01.
 *
 * Los estados vacíos, los diálogos de confirmación del carrito, las
 * confirmaciones de favorito y los avisos de disponibilidad son LITERALES de los
 * criterios de aceptación y viven en `MENSAJES_EXPLORACION` (`@foodhub/shared`),
 * no acá. Lo que sigue es el resto de la copia: títulos, rótulos de filtro,
 * etiquetas de accesibilidad y las tres o cuatro frases que la documentación
 * describe sin fijar ("advertencia visual indicando stock reducido", "botón de
 * acceso al feed", "acceso directo a la configuración del dispositivo").
 */
export const TEXTOS_EXPLORACION = {
  // --- Feed (PAN-EXP-01) -----------------------------------------------------
  /** [PROPIO] La documentación no fija el placeholder del buscador. */
  buscarPlaceholder: 'Buscar platos o categorías',
  /** [PROPIO] Título de la hoja de filtros y etiqueta accesible de su ícono. */
  filtros: 'Filtros',
  cerrar: 'Cerrar',
  /**
   * [PROPIO] US-EXP-01 pide "distancia aproximada" en la tarjeta sin fijar el
   * formato. Se abrevia porque compite por el ancho con el nombre del cocinero.
   */
  distancia: (km: number) => `a ${km.toLocaleString('es-AR')} km`,

  // --- Filtros (PAN-EXP-03) --------------------------------------------------
  categoria: 'Categoría',
  rangoDePrecio: 'Rango de precio',
  precioMinimo: 'Mínimo',
  precioMaximo: 'Máximo',
  /** [PROPIO] Rótulos de los dos filtros que US-EXP-03 nombra sin dar etiqueta. */
  distanciaMaxima: 'Distancia máxima',
  valoracionMinima: 'Valoración mínima',
  /** [PROPIO] Opciones del filtro de distancia, en kilómetros. */
  distanciaOpcion: (km: number) => `${String(km)} km`,
  /** [PROPIO] Opciones del filtro de valoración. */
  valoracionOpcion: (estrellas: number) => `${String(estrellas)}+`,
  /** [PROPIO] Etiqueta accesible del chip que quita un filtro. */
  quitarFiltro: (filtro: string) => `Quitar filtro ${filtro}`,
  /** [PROPIO] Cómo se nombra cada filtro activo en su chip. */
  chipPrecio: (minimo: string, maximo: string) => `$${minimo} – $${maximo}`,
  chipPrecioDesde: (minimo: string) => `desde $${minimo}`,
  chipPrecioHasta: (maximo: string) => `hasta $${maximo}`,

  // --- Mapa (PAN-EXP-02) -----------------------------------------------------
  etiquetaMapa: 'Mapa de cocineros cercanos',
  /**
   * [PROPIO] US-EXP-02 pide "acceso directo a la configuración del dispositivo"
   * cuando el permiso está denegado, sin fijar el texto del botón.
   */
  abrirConfiguracion: 'Abrir configuración',
  /** [PROPIO] Contenido de la tarjeta emergente del marcador. */
  platosDisponibles: (cantidad: number) =>
    `${String(cantidad)} plato${cantidad === 1 ? '' : 's'} disponible${cantidad === 1 ? '' : 's'}`,
  /** [PROPIO] Etiqueta accesible de un grupo de marcadores (clustering). */
  cocinerosAgrupados: (cantidad: number) =>
    `${String(cantidad)} cocineros en esta zona`,

  // --- Perfil del cocinero (PAN-EXP-04) --------------------------------------
  /** [PROPIO] Título de la pantalla; la maquetación muestra el nombre, no un rótulo. */
  tituloPerfil: 'Perfil del cocinero',
  sobreElCocinero: 'Sobre el cocinero',
  susPlatos: 'Sus platos',
  /** [PROPIO] Acompaña al promedio de estrellas del perfil. */
  cantidadResenas: (cantidad: number) =>
    `${String(cantidad)} reseña${cantidad === 1 ? '' : 's'}`,
  /** [PROPIO] Etiquetas accesibles del botón de favorito, en sus dos estados. */
  guardarFavorito: 'Guardar en favoritos',
  quitarFavorito: 'Quitar de favoritos',

  // --- Detalle del plato (PAN-EXP-05) ----------------------------------------
  descripcion: 'Descripción',
  tiempoEstimado: 'Tiempo estimado de preparación',
  tiempoEstimadoMinutos: (minutos: number) => `${String(minutos)} min`,
  /**
   * [PROPIO] US-EXP-05 pide, para "Últimas unidades", "una advertencia visual
   * indicando stock reducido" sin fijar el texto.
   */
  advertenciaUltimasUnidades: 'Quedan pocas unidades de este plato.',
  /** [PROPIO] Botón único de `DialogoExito`, igual que en Publicaciones. */
  aceptar: 'Aceptar',

  // --- Favoritos ------------------------------------------------------------
  /** [PROPIO] Etiqueta accesible del acceso a "Mis favoritos" desde el feed. */
  irAFavoritos: 'Ver mis favoritos',
} as const;

/**
 * Carrito (US-EXP-07) · PAN-PED-01.
 *
 * Bloque propio y no parte de `TEXTOS_EXPLORACION`: la pantalla pertenece al
 * módulo de Pedidos en la maquetación, y US-PED-01 va a sumar su copia acá al
 * lado en lugar de dentro de la de exploración.
 */
export const TEXTOS_CARRITO = {
  /** [PROPIO] Título de la pantalla. */
  titulo: 'Tu pedido',
  total: 'Total',
  /**
   * [PROPIO] US-EXP-07 muestra el tiempo estimado "como referencia (ej. 'Listo
   * en 25–30 min')". El ejemplo del documento usa un rango; con un solo valor no
   * tiene sentido repetirlo dos veces, así que hay dos formas.
   */
  listoEn: (minutos: number) => `Listo en ${String(minutos)} min`,
  listoEnRango: (minimo: number, maximo: number) =>
    `Listo en ${String(minimo)}–${String(maximo)} min`,
  /**
   * [PROPIO] US-EXP-07 pide, en el estado vacío, "un botón de acceso al feed"
   * sin fijar su texto.
   */
  explorarPlatos: 'Explorar platos',
  /** [PROPIO] Etiquetas accesibles del selector de cantidad. */
  sumarUnidad: 'Sumar una unidad',
  restarUnidad: 'Restar una unidad',
  quitarDelCarrito: 'Quitar del carrito',
  /** [PROPIO] Etiqueta accesible del botón flotante y su contador. */
  irAlCarrito: 'Ir al carrito',
  unidadesEnCarrito: (cantidad: number) =>
    `${String(cantidad)} unidad${cantidad === 1 ? '' : 'es'} en el carrito`,
  /** [PROPIO] Placeholder del campo de notas, cuyo rótulo sí es literal. */
  notasPlaceholder: 'Ej.: sin sal, tocar el timbre del 2.º B',
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
  /**
   * Las dos pantallas del modulo de Reseñas a las que llega el de Pedidos.
   *
   * US-PED-06 y US-PED-07 exigen el botón "Dejar reseña" sobre un pedido
   * completado sin reseñar, y US-PED-08 el de "Calificar cliente": los botones
   * se muestran igual y llevan acá hasta que el módulo RES exista (decisión del
   * equipo, 2026-08-19). Ocultarlos habría dejado esos criterios sin nada que
   * verificar.
   *
   * Las dos llevan el mismo código PAN porque la maquetación dibuja una sola
   * pantalla de reseña, la del cliente; US-RES-02 -la calificación en el sentido
   * inverso- no tiene código propio en el inventario.
   */
  dejarResena: {
    codigo: 'PAN-RES-01',
    modulo: 'Reseñas y calificaciones',
    titulo: 'Dejar reseña',
    descripcion:
      'La calificación con estrellas y el comentario de cada plato que pediste, una vez que el pedido se completó.',
  },
  calificarCliente: {
    codigo: 'PAN-RES-01',
    modulo: 'Reseñas y calificaciones',
    titulo: 'Calificar cliente',
    descripcion:
      'Tu calificación del cliente después de un pedido, con estrellas y un comentario opcional.',
  },
  /**
   * El perfil publico del cliente, cuarto criterio de US-DASH-03.
   *
   * "El cocinero presiona sobre un cliente del listado -> navegue al perfil
   * publico del cliente mostrando su informacion basica y el historial de
   * pedidos realizados a ese cocinero."
   *
   * NO TIENE CODIGO PAN: el inventario de la Etapa 5 dibuja el perfil publico
   * del COCINERO (PAN-EXP-04) y no el del cliente, y ninguna US lo define.
   * Codificarlo seria inventar una pantalla entera -layout, textos y
   * navegacion- sin respaldo en la documentacion, asi que el destino existe y
   * se anuncia como pendiente, igual que se hizo con las dos pantallas de
   * resenas en el sprint de Pedidos (decision del equipo, 20/08/2026).
   */
  perfilCliente: {
    codigo: 'PAN-?',
    modulo: 'Dashboard del cocinero',
    titulo: 'Perfil del cliente',
    descripcion:
      'La información básica del cliente y el historial de pedidos que te hizo.',
  },
  notificaciones: {
    codigo: 'PAN-NOT-01',
    modulo: 'Notificaciones y alertas',
    titulo: 'Notificaciones',
    descripcion:
      'El historial de avisos de la aplicación: cambios de estado de tus pedidos, mensajes nuevos y reseñas recibidas.',
  },
  manualAyuda: {
    codigo: 'PAN-AYU-01',
    modulo: 'Ayuda y soporte',
    titulo: 'Manual de usuario',
    descripcion: TEXTOS_AYUDA.manualPendiente,
  },
  contactoAyuda: {
    codigo: 'PAN-AYU-03',
    modulo: 'Ayuda y soporte',
    titulo: 'Contactar al soporte',
    descripcion: TEXTOS_AYUDA.contactoPendiente,
  },
  legalAyuda: {
    codigo: 'PAN-AYU-04',
    modulo: 'Ayuda y soporte',
    titulo: 'Información legal',
    descripcion: TEXTOS_AYUDA.legalPendiente,
  },
} as const;

/**
 * Textos de las pantallas del módulo de Pedidos que NO salen de un criterio de
 * aceptación.
 *
 * Los literales del módulo -las leyendas de los estados, los mensajes de error,
 * los rótulos de las pestañas y de los botones- viven en `MENSAJES_PEDIDO`
 * (`@foodhub/shared`) porque los comparten la API y la app. Acá quedan solo los
 * que son de esta interfaz y de nadie más: etiquetas accesibles y rótulos de
 * apoyo.
 */
export const TEXTOS_PEDIDOS = {
  /** [PROPIO] Etiquetas accesibles de la lista de pestañas. */
  pestanasDePedidos: 'Pestañas de pedidos',
  abrirPedido: (numero: string) => `Abrir el pedido ${numero}`,

  /**
   * [PROPIO] Contador de la pestaña, anunciado aparte del rótulo para que un
   * lector de pantalla diga "Nuevos, 2 pedidos" y no "Nuevos 2".
   */
  cantidadDePedidos: (cantidad: number) =>
    `${String(cantidad)} pedido${cantidad === 1 ? '' : 's'}`,

  /** [PROPIO] Cabecera de la lista de platos del detalle. */
  platosDelPedido: 'Platos del pedido',

  /**
   * [PROPIO] Se muestra bajo el primer plato cuando el pedido tiene más de uno,
   * porque la tarjeta solo puede mostrar el primero (US-PED-06).
   */
  platosAdicionales: (cantidad: number) =>
    `y ${String(cantidad)} plato${cantidad === 1 ? '' : 's'} más`,

  /** [PROPIO] Rótulo de la línea del cliente en el detalle del cocinero. */
  cliente: 'Cliente',

  /** [PROPIO] Rótulo de la línea del cocinero en el detalle del cliente. */
  cocinero: 'Cocinero',

  /** [PROPIO] Rótulo del bloque de motivos rápidos (US-CFG-02 los provee). */
  motivosRapidos: 'Motivos frecuentes',

  /** [PROPIO] Rótulo del campo de texto libre del rechazo. */
  motivoDelRechazo: 'Motivo del rechazo',

  /** [PROPIO] Rótulo del campo de texto libre de la cancelación. */
  motivoDeLaCancelacion: 'Motivo de la cancelación',
} as const;

/**
 * Textos de PAN-DASH-01 que NO salen de un criterio de aceptacion.
 *
 * Los literales del modulo -los rotulos de las tarjetas, los nombres de los
 * cuatro estados, las opciones del selector y los cuatro estados vacios- viven
 * en `MENSAJES_DASHBOARD` (`@foodhub/shared`). Aca queda solo lo que es de esta
 * interfaz y de nadie mas: etiquetas accesibles, los rotulos de apoyo del
 * ranking y el vocabulario del calendario, que la documentacion no dibuja.
 */
export const TEXTOS_DASHBOARD = {
  /**
   * [PROPIO] Etiqueta accesible del disparador del selector.
   *
   * Anuncia el periodo vigente ademas de la accion: un lector de pantalla sobre
   * un boton que dice solo "Este mes" no deja claro que se puede cambiar.
   */
  cambiarPeriodo: (rango: string) => `Período: ${rango}. Cambiar el período`,

  /** [PROPIO] Etiqueta accesible de la hoja de periodos. */
  opcionesDePeriodo: 'Opciones de período',

  /** [PROPIO] Vuelve del panel personalizado a la lista de periodos. */
  volverALosPeriodos: 'Volver a los períodos',

  /**
   * [PROPIO] Unidades vendidas de un plato del ranking (US-DASH-02, "cantidad
   * de veces pedido en el periodo"). El criterio pide el dato, no el texto.
   */
  vecesPedido: (unidades: number) =>
    `${String(unidades)} ${unidades === 1 ? 'vez' : 'veces'}`,

  /** [PROPIO] Etiqueta accesible de la posicion en el ranking. */
  puestoEnElRanking: (puesto: number) => `Puesto ${String(puesto)}`,

  /** [PROPIO] Etiqueta accesible de la fila de un cliente recurrente. */
  abrirPerfilDelCliente: (nombre: string) => `Ver el perfil de ${nombre}`,

  /**
   * [PROPIO] Etiqueta accesible del grafico de US-DASH-04.
   *
   * El grafico en si queda oculto para el lector de pantalla: el listado que va
   * debajo ya dice cada estado con su cantidad y su porcentaje, y anunciarlo dos
   * veces solo alarga la lectura.
   */
  distribucionDePedidos: 'Distribución de pedidos por estado',

  /** [PROPIO] Porcentaje de un estado en el listado del grafico. */
  porcentaje: (valor: number) => `${String(valor)} %`,

  /**
   * [PROPIO] Iniciales de los dias en la grilla del calendario, de lunes a
   * domingo. Miercoles va con X para no repetir la M de martes.
   */
  diasDeLaSemana: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],

  /** [PROPIO] Etiquetas accesibles de la navegacion del calendario. */
  mesAnterior: 'Mes anterior',
  mesSiguiente: 'Mes siguiente',
} as const;

/**
 * Modulo de Resenas y Calificaciones — PAN-RES-01 y PAN-RES-02.
 *
 * Solo los textos DE PANTALLA. Los literales de los criterios de aceptacion
 * viven en `MENSAJES_RESENA` de `@foodhub/shared`, porque el servidor tambien
 * los usa: si el mensaje que valida la API y el que muestra el formulario se
 * escribieran por separado, se irian separando sin que nadie lo note.
 */
export const TEXTOS_RESENA = {
  // --- PAN-RES-01, dejar resena ---------------------------------------------
  tituloDejar: 'Dejar reseña',
  tituloEditar: 'Editar mi reseña',
  tituloVer: 'Mi reseña',

  /** [MOCKUP PAN-RES-01] Encabezado del selector de estrellas. */
  etiquetaCalificacion: '¿Cómo fue tu experiencia?',

  /**
   * [MOCKUP PAN-RES-01] Campo de comentario, con el contador `usado/maximo`
   * que la maquetacion dibuja arriba a la derecha (ahi se lee "107/500").
   * El maximo de 500 sale de RF080.
   */
  etiquetaComentario: 'Comentario (opcional)',
  placeholderComentario: 'Qué te gustó, qué mejorarías…',
  contadorComentario: (usado: number, maximo: number) =>
    `${String(usado)}/${String(maximo)}`,

  /**
   * [MOCKUP PAN-RES-01, con el plazo corregido] El pie de la maquetacion dice
   * "24 hs", pero RF080 fija 48 horas y esa es la version vigente (decision del
   * equipo, 2026-08-23): la maquetacion es de la Etapa 5 y es anterior al
   * cambio de modelo del 18/08.
   */
  avisoPublica:
    'Una vez enviada, tu reseña será pública. Podés editarla durante 48 hs.',

  /** [PROPIO] Encabezado de los tags positivos de RF080. */
  etiquetaTags: '¿Qué destacarías?',

  /** [PROPIO] Encabezado del adjunto. El limite de 5 MB sale de RF080. */
  etiquetaFoto: 'Foto del plato',
  ayudaFoto: 'Opcional. JPG, PNG o WEBP de hasta 5 MB.',
  quitarFoto: 'Quitar foto',

  /**
   * [PROPIO] Cuantos cocineros calificaron a un cliente (US-RES-02).
   *
   * NO son resenas: la resena es del cliente hacia un plato y es publica; esto
   * es la direccion inversa y privada. Reusar el texto de resenas confundia dos
   * cosas distintas en la misma pantalla.
   */
  cantidadCocinerosQueCalificaron: (cantidad: number) =>
    cantidad === 1
      ? '1 cocinero lo calificó'
      : `${String(cantidad)} cocineros lo calificaron`,

  /** [PROPIO] La ruta se abrio sin indicar a que cliente se califica. */
  sinCliente:
    'No pudimos saber a qué cliente querés calificar. Volvé al pedido y entrá desde ahí.',

  /** [PROPIO] La ruta se abrio sin indicar que plato se resena. */
  sinPublicacion:
    'No pudimos saber qué plato querés reseñar. Volvé al pedido y entrá desde el plato.',

  /** [PROPIO] Boton que cierra el dialogo de exito y vuelve al pedido. */
  cerrarExito: 'Listo',

  /** [PROPIO] Titulo de la vista previa que exige US-RES-01 antes de publicar. */
  tituloVistaPrevia: 'Así se va a ver tu reseña',

  /** [PROPIO] Estado de solo lectura, fuera de la ventana de 48 horas. */
  avisoSoloLectura:
    'Ya pasó el plazo para editar esta reseña. Si volvés a pedir el plato vas a poder actualizarla.',

  // --- PAN-RES-02, calificar al cliente -------------------------------------
  tituloCalificar: 'Calificar cliente',
  tituloEditarCalificacion: 'Editar calificación',

  /** [PROPIO] Encabezado del selector en la calificacion del cliente. */
  etiquetaCalificacionCliente: '¿Cómo fue la experiencia con el cliente?',

  /** [PROPIO] Campo de comentario. El maximo de 300 sale de RF081. */
  etiquetaComentarioCliente: 'Comentario',
  placeholderComentarioCliente: 'Opcional. Visible solo para otros cocineros.',

  /**
   * [PROPIO] Aviso de privacidad de US-RES-02. Se muestra ANTES de enviar y no
   * solo en la confirmacion: el cocinero tiene que saber quien va a leer lo que
   * escribe mientras lo escribe, no despues.
   */
  avisoPrivacidad:
    'El cliente no ve esta calificación. Solo la ven otros cocineros cuando reciben un pedido suyo.',

  // --- Seccion de resenas del perfil publico (PAN-EXP-04) -------------------
  tituloSeccion: 'Reseñas',
  verTodas: 'Ver todas',

  /** [PROPIO] Encabezado del selector de orden y filtros. */
  tituloFiltros: 'Ordenar y filtrar',
  etiquetaOrden: 'Ordenar por',
  etiquetaEstrellas: 'Filtrar por estrellas',
  aplicarFiltros: 'Aplicar',
  limpiarFiltros: 'Limpiar',

  /**
   * [PROPIO] Leyenda del promedio todavia no publicable. US-RES-03 no fija un
   * texto para el caso "tiene resenas pero no llega al minimo", que es distinto
   * de "no tiene ninguna": el segundo ya tiene su literal.
   */
  promedioInsuficiente: 'Todavía no hay suficientes reseñas para un promedio.',

  /** [PROPIO] Cantidad de resenas con foto, del resumen de RF082. */
  conFoto: (cantidad: number) =>
    cantidad === 1 ? '1 con foto' : `${String(cantidad)} con foto`,

  /** [PROPIO] Marca de una resena editada, junto a la fecha original. */
  editada: '(editada)',
} as const;
