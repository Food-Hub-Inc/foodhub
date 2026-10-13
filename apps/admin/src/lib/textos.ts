/**
 * Textos de interfaz del panel que NO están comprometidos por un criterio de
 * aceptación.
 *
 * QUÉ VA ACÁ Y QUÉ NO
 *
 *   NO va  todo mensaje que la documentación fija palabra por palabra. Esos
 *          viven en `@foodhub/shared` (MENSAJES_AUTH, MENSAJES_USUARIO,
 *          MENSAJES_AUDITORIA, MENSAJES_ERROR) y se importan de ahí. Las
 *          pruebas funcionales de la Etapa 6 los verifican letra por letra.
 *   SÍ va  la copia de la maquetación que no es un mensaje de error (rótulos
 *          de columnas, placeholders, títulos de diálogo) y los textos que la
 *          documentación no define y hubo que redactar para completar una
 *          pantalla.
 *
 * Los redactados por el equipo de desarrollo quedan marcados con [PROPIO] para
 * que la revisión de la Etapa 6 pueda distinguirlos de la maquetación y, si
 * corresponde, promoverlos a `@foodhub/shared`.
 */

/** Nombre y rótulos del shell del panel. */
export const TEXTOS_PANEL = {
  seccionGeneral: 'GENERAL',
  insigniaAdmin: 'ADMIN',
  cerrarSesion: 'Cerrar sesión',
  ajustes: 'Ajustes',
  /** [PROPIO] Texto alternativo del logo, para lectores de pantalla. */
  logo: 'FoodHub',
} as const;

/** PAN-AUT-03 adaptada a web. */
export const TEXTOS_LOGIN = {
  titulo: 'Panel de administración',
  /** [PROPIO] Subtítulo de la tarjeta de ingreso. */
  subtitulo: 'Ingresá con tu cuenta de administrador de FoodHub.',
  correo: 'Correo electrónico',
  correoPlaceholder: 'administrador@foodhub.com',
  contrasena: 'Contraseña',
  contrasenaPlaceholder: 'Ingresá tu contraseña',
  mostrarContrasena: 'Mostrar contraseña',
  ocultarContrasena: 'Ocultar contraseña',
  ingresar: 'Iniciar sesión',
  ingresando: 'Verificando…',
  /** Enlace a la recuperación de contraseña, como pide US-AUT-04. */
  olvideMiContrasena: '¿Olvidaste tu contraseña?',
  /** [PROPIO] Aclara que el panel no es para clientes ni cocineros. */
  soloAdministradores:
    'El acceso al panel está reservado a las cuentas con rol de administrador.',
} as const;

/**
 * Recuperación de contraseña desde el panel — US-AUT-04.
 *
 * La maquetación de la Etapa 5 resuelve esta historia en PAN-AUT-04, que es una
 * pantalla de la app móvil, porque el actor de US-AUT-04 es el cliente y el
 * cocinero. El administrador quedó sin camino: trabaja solo en el panel y, si
 * olvidaba su contraseña, no tenía desde dónde pedir el enlace. Misma decisión y
 * mismo motivo que en `/nueva-password` (ver TEXTOS_NUEVA_PASSWORD).
 *
 * Los dos mensajes de resultado los redacta la API —«Te enviamos un enlace para
 * restablecer tu contraseña.» y «No existe una cuenta asociada a ese correo
 * electrónico.», los dos literales de US-AUT-04— y esta pantalla los muestra tal
 * cual, sin tener su propia copia. Lo de acá es todo [PROPIO].
 */
export const TEXTOS_RECUPERAR = {
  titulo: 'Recuperar contraseña',
  descripcion:
    'Te enviamos un enlace al correo de tu cuenta para que definas una contraseña nueva.',
  correo: 'Correo electrónico',
  correoPlaceholder: 'administrador@foodhub.com',
  enviar: 'Enviar enlace',
  enviando: 'Enviando…',
  volverAlIngreso: 'Volver al inicio de sesión',
} as const;

/**
 * Definición de contraseña de un administrador (US-GURP-06 y US-AUT-04).
 *
 * La maquetación de la Etapa 5 no tiene esta pantalla: PAN-AUT-04.1 resuelve el
 * caso en la app móvil, que es adonde va el enlace cuando quien lo recibe es un
 * CLIENTE. Para un ADMINISTRADOR no había destino, y obligarlo a instalar la
 * app solo para definir su contraseña no tenía sentido, así que la API lo manda
 * acá. Todos los textos son [PROPIO]: no hay criterio de aceptación que los
 * fije, salvo los de validación, que salen de `restablecerPasswordSchema`.
 *
 * A esta pantalla llegan DOS enlaces distintos —la invitación y la recuperación
 * de contraseña— porque para ella son el mismo caso: una sesión abierta por
 * GoTrue y una cuenta sin contraseña propia. Por eso los textos no nombran
 * ninguno de los dos: decirle "tu invitación venció" a quien pidió recuperar su
 * contraseña sería mentirle.
 */
export const TEXTOS_NUEVA_PASSWORD = {
  titulo: 'Definí tu contraseña',
  descripcion:
    'Elegí la contraseña con la que vas a entrar al panel de administración.',
  nueva: 'Nueva contraseña',
  nuevaPlaceholder: 'Ingresá tu nueva contraseña',
  confirmar: 'Confirmar contraseña',
  confirmarPlaceholder: 'Repetí la contraseña',
  guardar: 'Guardar contraseña',
  guardando: 'Guardando…',

  /** Estado de éxito, antes de volver al ingreso. */
  exitoTitulo: 'Listo',
  exitoDescripcion:
    'Ya podés entrar al panel con tu correo y la contraseña que acabás de definir.',
  irAlIngreso: 'Ir a iniciar sesión',

  /**
   * Estado de enlace inválido: alguien escribió la dirección a mano, o el enlace
   * del correo venció o ya se usó. Se explica sin tecnicismos y con una salida
   * que sirve para los dos orígenes posibles del enlace.
   */
  enlaceInvalidoTitulo: 'Este enlace ya no es válido',
  enlaceInvalidoDescripcion:
    'Los enlaces del correo vencen a las pocas horas y solo se pueden usar una vez. Pedí uno nuevo desde "¿Olvidaste tu contraseña?", o si estabas aceptando una invitación, pedile al administrador que te invitó que te la reenvíe.',
  pedirOtroEnlace: 'Pedir un enlace nuevo',
  volverAlIngreso: 'Volver al inicio de sesión',

  /** Verificación del enlace, antes de saber si hay invitación válida. */
  verificandoEnlace: 'Verificando el enlace…',
} as const;

/** Rótulos genéricos de formulario, comunes a todos los diálogos. */
export const TEXTOS_FORMULARIO = {
  cancelar: 'Cancelar',
  guardar: 'Guardar cambios',
  crear: 'Crear usuario',
  /** [PROPIO] Estado del botón mientras la operación está en curso. */
  guardando: 'Guardando…',
  nombre: 'Nombre',
  apellido: 'Apellido',
  correo: 'Correo electrónico',
  rol: 'Rol',
  /**
   * LITERAL - cancelar de una ventana de confirmación "Sí, X" / "No, volver"
   * (US-CFG-01 al deshabilitar una categoría, US-CFG-03 al guardar
   * parámetros). Es distinto de `cancelar`: ese cierra un formulario, este
   * responde a una pregunta de sí/no.
   */
  noVolver: 'No, volver',
} as const;

/** PAN-ADM-01 · Gestión de usuarios. */
export const TEXTOS_USUARIOS = {
  titulo: 'Gestión de Usuarios',
  buscar: 'Buscar por nombre o correo electrónico...',
  buscarEtiqueta: 'Buscar usuarios',
  filtroRol: 'Rol',
  filtroEstado: 'Estado',
  todos: 'Todos',
  masFiltros: 'Más filtros',
  nuevo: 'Nuevo usuario',
  sinAcciones: 'Sin acciones',

  accionEditar: 'Editar usuario',
  accionSuspender: 'Suspender cuenta',
  accionRehabilitar: 'Rehabilitar cuenta',
  accionEliminar: 'Dar de baja la cuenta',

  columnaId: 'ID',
  columnaUsuario: 'USUARIO',
  columnaCorreo: 'CORREO',
  columnaRol: 'ROL',
  columnaEstado: 'ESTADO',
  columnaRegistro: 'FECHA DE REGISTRO',
  columnaAcciones: 'ACCIONES',

  dialogoAltaTitulo: 'Nuevo usuario',
  /**
   * US-GURP-06: el alta es por invitación y por eso el formulario no pide
   * contraseña. Decirlo en pantalla evita que el administrador la busque.
   */
  dialogoAltaAyuda:
    'La persona recibe un correo con un enlace para definir su propia contraseña. El alta de cocinero se hace desde la aplicación móvil, porque necesita la ubicación del GPS.',
  dialogoEdicionTitulo: 'Editar usuario',
  dialogoSuspensionTitulo: 'Suspender cuenta',
  dialogoRehabilitacionTitulo: 'Rehabilitar cuenta',
  dialogoBajaTitulo: 'Dar de baja la cuenta',
  motivo: 'Motivo de la suspensión',
  motivoPlaceholder: 'Explicá por qué se suspende esta cuenta',

  /**
   * [PROPIO] `MENSAJES_USUARIO` tiene la confirmación de suspensión,
   * rehabilitación y baja, pero no la del alta ni la de la edición desde el
   * panel (US-GURP-06 y US-GURP-07). Se redactan acá; son candidatas a
   * moverse a `@foodhub/shared` junto a las otras tres.
   */
  avisoUsuarioCreado:
    'La cuenta fue creada. La persona va a recibir un correo para definir su contraseña.',
  /** [PROPIO] Confirmación de la edición desde el panel (US-GURP-07). */
  avisoUsuarioEditado: 'Se guardaron los cambios de la cuenta.',
  /** [PROPIO] Confirmación del levantamiento de la suspensión (US-GURP-08). */
  confirmarRehabilitacion:
    'La cuenta vuelve a estado activo y la persona puede volver a iniciar sesión.',

  /** [PROPIO] Estado vacío del listado sin filtros aplicados. */
  vacioSinFiltros: 'Todavía no hay usuarios registrados en la plataforma.',
  /** [PROPIO] Estado vacío del listado con filtros aplicados (US-GURP-05). */
  vacioConFiltros: 'No se encontraron usuarios con los filtros seleccionados.',
  limpiarFiltros: 'Limpiar filtros',

  /**
   * [PROPIO] `filtrosUsuarioSchema` define exactamente tres filtros (búsqueda,
   * rol y estado) y los tres ya están en la barra. No hay filtros adicionales
   * que desplegar.
   */
  masFiltrosNoDisponible:
    'No hay filtros adicionales definidos para esta pantalla.',
} as const;

/** PAN-AUD-01 · Registros de auditoría. */
export const TEXTOS_AUDITORIA = {
  titulo: 'Registros de Auditoría',
  solapaOperaciones: 'Operaciones',
  solapaSeguridad: 'Seguridad',
  exportar: 'Exportar CSV',

  desde: 'Desde',
  hasta: 'Hasta',
  operacion: 'Operación',
  tipoEvento: 'Tipo de evento',
  todas: 'Todas',
  todos: 'Todos',
  ip: 'IP de origen...',
  ipEtiqueta: 'IP de origen',
  usuarioId: 'ID de usuario...',
  usuarioIdEtiqueta: 'ID de usuario',
  correoIntentado: 'Correo intentado...',
  correoIntentadoEtiqueta: 'Correo intentado',
  porPagina: 'por página',

  columnaFechaHora: 'FECHA Y HORA',
  columnaEmail: 'EMAIL DEL USUARIO',
  columnaObjeto: 'OBJETO AFECTADO',
  columnaOperacion: 'OPERACIÓN',
  columnaIp: 'IP DE ORIGEN',
  columnaUsuarioId: 'ID USUARIO',
  columnaTipoEvento: 'TIPO DE EVENTO',
  columnaCorreoIntentado: 'CORREO INTENTADO',
  columnaRecurso: 'RECURSO SOLICITADO',
  columnaMotivo: 'MOTIVO',

  campoObjetoId: 'ID del objeto afectado',
  campoRegistroId: 'ID del registro',
  campoEventoId: 'ID del evento',

  detalleTitulo: 'Detalle del registro',
  detalleTituloSeguridad: 'Detalle del evento de seguridad',
  detalleDatosAdicionales: 'Datos adicionales',
  detalleSinDatosAdicionales: 'Este registro no guardó datos adicionales.',
  verDetalle: 'Ver detalle del registro',

  /**
   * [PROPIO] El filtro por identificador exige un UUID completo
   * (`filtrosAuditoriaSchema` lo valida con `z.uuid()`), así que un valor
   * parcial no se manda al servidor y hay que explicar por qué.
   */
  usuarioIdInvalido:
    'Ingresá el identificador completo del usuario para aplicar este filtro.',
  /** [PROPIO] Rango de fechas imposible, antes de consultar al servidor. */
  rangoInvalido: 'La fecha de inicio no puede ser posterior a la de fin.',
} as const;

/** PAN-ADM-04 · Configuración del sistema, marco de pestañas. */
export const TEXTOS_CONFIGURACION = {
  titulo: 'Configuración del sistema',
  /** [PROPIO] El módulo cubre cuatro áreas administrables sin desplegar código. */
  subtitulo:
    'Categorías, motivos de cancelación, parámetros generales y términos y condiciones.',
  solapaCategorias: 'Categorías de platos',
  solapaMotivos: 'Motivos de cancelación',
  solapaParametros: 'Parámetros generales',
  solapaTerminos: 'Términos y condiciones',
} as const;

/** PAN-ADM-04 · Categorías de platos — US-CFG-01. */
export const TEXTOS_CATEGORIAS = {
  /** LITERAL - US-CFG-01, título de la vista. */
  titulo: 'Categorías de platos',
  /** LITERAL - US-CFG-01, botón que abre el alta. */
  nuevo: 'Crear',
  /** [PROPIO] Placeholder de la barra de búsqueda por nombre. */
  buscar: 'Buscar por nombre de categoría...',
  buscarEtiqueta: 'Buscar categorías',
  filtroEstado: 'Estado',
  /** LITERAL - US-CFG-01, opción del filtro de estado que no filtra. */
  todas: 'Todas',
  /** LITERAL - US-CFG-01, opciones del filtro de estado de habilitación. */
  habilitadas: 'Habilitadas',
  deshabilitadas: 'Deshabilitadas',

  columnaNombre: 'NOMBRE',
  columnaDescripcion: 'DESCRIPCIÓN',
  columnaPublicaciones: 'PUBLICACIONES ACTIVAS',
  columnaEstado: 'ESTADO',
  columnaAcciones: 'ACCIONES',

  accionEditar: 'Editar categoría',
  accionHabilitar: 'Habilitar categoría',
  accionDeshabilitar: 'Deshabilitar categoría',
  accionEliminar: 'Eliminar categoría',

  /**
   * LITERAL - US-CFG-01: "Botones: 'Sí, deshabilitar' y 'No, volver'." Es
   * distinto de `accionDeshabilitar`, que rotula el botón de la fila
   * (aria-label), no el de este diálogo.
   */
  confirmarDeshabilitarSi: 'Sí, deshabilitar',

  /** [PROPIO] Título del diálogo de alta; el botón que lo abre dice "Crear". */
  dialogoAltaTitulo: 'Crear categoría',
  dialogoEdicionTitulo: 'Editar categoría',
  dialogoHabilitacionTitulo: 'Habilitar categoría',
  dialogoEliminacionTitulo: 'Eliminar categoría',

  /** LITERAL - US-CFG-01, botón que confirma el alta (no es "Guardar cambios"). */
  guardarAlta: 'Guardar',

  campoNombre: 'Nombre',
  campoDescripcion: 'Descripción',
  campoImagen: 'Imagen representativa',
  imagenAyuda: 'JPG, PNG o WEBP de hasta 2 MB.',
  imagenQuitar: 'Quitar imagen',
  imagenSubiendo: 'Subiendo imagen…',
  imagenSeleccionar: 'Elegir imagen',

  /** [PROPIO] Confirmación de habilitar, sin advertencia previa (US-CFG-01: "sin solicitar confirmación"). */
  confirmarHabilitar:
    'La categoría vuelve a estar disponible para que los cocineros la asignen a nuevas publicaciones.',
  /** [PROPIO] Advertencia de la eliminación física, sin criterio de aceptación que la fije. */
  confirmarEliminar:
    'Esta acción no se puede deshacer. La categoría se elimina de forma permanente.',

  /** [PROPIO] Estado vacío del listado sin filtros aplicados. */
  vacioSinFiltros: 'Todavía no hay categorías cargadas.',
  /** [PROPIO] Estado vacío del listado con filtros aplicados. */
  vacioConFiltros:
    'No se encontraron categorías con los filtros seleccionados.',
  limpiarFiltros: 'Limpiar filtros',
} as const;

/** PAN-ADM-04 · Motivos de cancelación de pedido — US-CFG-02. */
export const TEXTOS_MOTIVOS = {
  titulo: 'Motivos de cancelación',
  /** LITERAL - US-CFG-02, botón que abre el alta (RF056: "Presiono 'Crear'"). */
  nuevo: 'Crear',
  filtroAplicabilidad: 'Aplicabilidad',
  filtroEstado: 'Estado',
  todos: 'Todos',
  habilitados: 'Habilitados',
  deshabilitados: 'Deshabilitados',

  columnaNombre: 'NOMBRE',
  columnaAplicabilidad: 'APLICABILIDAD',
  columnaPedidos: 'PEDIDOS ASOCIADOS',
  columnaEstado: 'ESTADO',
  columnaAcciones: 'ACCIONES',

  accionEditar: 'Editar motivo',
  accionHabilitar: 'Habilitar motivo',
  accionDeshabilitar: 'Deshabilitar motivo',

  dialogoAltaTitulo: 'Crear motivo',
  dialogoEdicionTitulo: 'Editar motivo',
  /** [PROPIO] Título corto; el texto completo de la advertencia es el literal de RF056. */
  dialogoDeshabilitacionTitulo: 'Deshabilitar motivo',

  /** LITERAL - US-CFG-02, RF056: "Los botones disponibles son 'Guardar' y 'Cancelar'." */
  guardarAlta: 'Guardar',

  campoNombre: 'Nombre del motivo',
  campoAplicableA: 'Aplicable a',

  /** [PROPIO] Estado vacío del listado sin filtros aplicados. */
  vacioSinFiltros: 'Todavía no hay motivos de cancelación cargados.',
  /** [PROPIO] Estado vacío del listado con filtros aplicados. */
  vacioConFiltros: 'No se encontraron motivos con los filtros seleccionados.',
  limpiarFiltros: 'Limpiar filtros',
} as const;

/**
 * Sección "Gestión de ayuda" del panel — US-AYU-05.
 *
 * Los textos que fijan los criterios de aceptación (pestañas, botones "Nuevo
 * capítulo" / "Nueva pregunta" / "Deshabilitar", etiquetas de campos, diálogo
 * de confirmación y confirmaciones de éxito) se importan de
 * `MENSAJES_AYUDA.admin` en `@foodhub/shared`. Acá quedan solo los rótulos de
 * columnas, títulos de diálogo y estados vacíos que la documentación no fija.
 */
export const TEXTOS_GESTION_AYUDA = {
  /** [PROPIO] Bajada de la pantalla. */
  subtitulo:
    'Administrá el manual de usuario y las preguntas frecuentes que ven los usuarios de la app.',
  /** [PROPIO] Acción que vuelve al listado desde la página de edición. */
  volver: 'Volver',
  /** [PROPIO] Bajada de la página de alta y edición de un capítulo. */
  subtituloFormularioCapitulo:
    'Completá el capítulo y sus secciones. Los cambios se reflejan de inmediato en la ayuda que ven los usuarios.',

  // --- Manual de usuario ---
  columnaTitulo: 'TÍTULO',
  columnaRol: 'ROL DESTINATARIO',
  columnaSecciones: 'SECCIONES',
  columnaEstado: 'ESTADO',
  columnaModificacion: 'ÚLTIMA MODIFICACIÓN',
  columnaAcciones: 'ACCIONES',
  /** [PROPIO] Acciones de fila del manual. */
  accionEditarCapitulo: 'Editar capítulo',
  accionHabilitarCapitulo: 'Habilitar capítulo',
  accionDeshabilitarCapitulo: 'Deshabilitar capítulo',
  dialogoAltaCapituloTitulo: 'Nuevo capítulo',
  dialogoEdicionCapituloTitulo: 'Editar capítulo',
  /** [PROPIO] Título corto; el texto completo es el literal de la US. */
  dialogoDeshabilitarTitulo: 'Deshabilitar contenido',
  /** [PROPIO] Placeholder del título de una sección. */
  placeholderTituloSeccion: 'Título de la sección',
  /** [PROPIO] Etiqueta del título de una sección del capítulo. */
  etiquetaTituloSeccion: 'Título de la sección',
  /** [PROPIO] Texto del botón que confirma el alta. */
  guardarAlta: 'Guardar',

  // --- Preguntas frecuentes ---
  columnaPregunta: 'PREGUNTA',
  columnaCategoria: 'CATEGORÍA',
  columnaVotosUtiles: 'VOTOS ÚTILES',
  /** [PROPIO] Acciones de fila de las FAQ. */
  accionEditarFaq: 'Editar pregunta',
  accionHabilitarFaq: 'Habilitar pregunta',
  accionDeshabilitarFaq: 'Deshabilitar pregunta',
  dialogoAltaFaqTitulo: 'Nueva pregunta',
  dialogoEdicionFaqTitulo: 'Editar pregunta',
  /** [PROPIO] Placeholder del enunciado. */
  placeholderPregunta: '¿Cómo hago…?',
  /** [PROPIO] Placeholder de la respuesta. */
  placeholderRespuesta: 'Escribí la respuesta que verá el usuario.',

  // --- Filtros ---
  filtroRol: 'Rol',
  filtroCategoria: 'Categoría',
  filtroEstado: 'Estado',
  todos: 'Todos',
  habilitados: 'Habilitados',
  deshabilitados: 'Deshabilitados',

  /** [PROPIO] Estado vacío sin filtros aplicados. */
  vacioManualSinFiltros: 'Todavía no cargaste capítulos del manual.',
  /** [PROPIO] Estado vacío con filtros aplicados. */
  vacioManualConFiltros: 'No hay capítulos que coincidan con los filtros.',
  /** [PROPIO] Estado vacío sin filtros aplicados. */
  vacioFaqSinFiltros: 'Todavía no cargaste preguntas frecuentes.',
  /** [PROPIO] Estado vacío con filtros aplicados. */
  vacioFaqConFiltros: 'No hay preguntas que coincidan con los filtros.',
  limpiarFiltros: 'Limpiar filtros',

  // --- Editor enriquecido ---
  /** [PROPIO] Acción que abre el selector de archivo para insertar una imagen. */
  insertarImagen: 'Insertar imagen',
  /** [PROPIO] Estado del botón mientras la imagen se sube a Storage. */
  subiendoImagen: 'Subiendo imagen…',
  /** [PROPIO] Error al subir la imagen ilustrativa. */
  errorImagen:
    'No pudimos subir la imagen. Revisá tu conexión e intentá de nuevo.',
  /** [PROPIO] Etiqueta accesible del editor de contenido. */
  etiquetaContenido: 'Contenido',
} as const;

/** PAN-ADM-04 · Parámetros generales del sistema — US-CFG-03. */
export const TEXTOS_PARAMETROS = {
  /** LITERAL - US-CFG-03: "presiono sobre 'Configuración general'". */
  titulo: 'Configuración general',
  solapaBusqueda: 'Parámetros de búsqueda',
  solapaPedidos: 'Parámetros de pedidos',
  solapaResenas: 'Parámetros de reseñas',
  solapaInstitucional: 'Información institucional',

  campoRadioBusqueda: 'Radio de búsqueda por defecto (km)',
  ayudaRadioBusqueda:
    'Radio, en kilómetros, que usa el feed y el mapa para mostrar cocineros cercanos por defecto.',
  campoDistanciaMaxima: 'Distancia máxima en filtros (km)',
  ayudaDistanciaMaxima:
    'Distancia máxima que un cliente puede seleccionar en el filtro de búsqueda.',
  campoPublicacionesPorPagina: 'Publicaciones por página en el feed',
  ayudaPublicacionesPorPagina:
    'Cantidad de publicaciones que se cargan por página en el feed.',

  campoTiempoCancelacion: 'Tiempo máximo para cancelar (minutos)',
  ayudaTiempoCancelacion:
    'Minutos que tiene el cliente para cancelar un pedido en estado "Creado".',
  campoTiempoExpiracion: 'Tiempo de respuesta del cocinero (minutos)',
  ayudaTiempoExpiracion:
    'Minutos que tiene el cocinero para aceptar o rechazar un pedido antes de que expire automáticamente.',

  campoMinimoResenas: 'Mínimo de reseñas para mostrar el promedio',
  ayudaMinimoResenas:
    'Cantidad mínima de reseñas que necesita un cocinero para mostrar su valoración promedio pública.',
  campoLimiteDiasResena: 'Tiempo límite para reseñar (días)',
  ayudaLimiteDiasResena:
    'Días, tras completar un pedido, que tiene el cliente para dejar una reseña.',

  /**
   * Filtro automático de moderación (RF080 y RF084). La lista arranca vacía y
   * la carga el administrador: ninguna fuente del proyecto define qué términos
   * hay que detectar, así que la decisión es suya y no del código.
   */
  campoTerminosModeracion: 'Términos bloqueados en reseñas',
  ayudaTerminosModeracion:
    'Un término por renglón. Se detectan sin distinguir mayúsculas ni tildes, y también dentro de una palabra más larga. Con la lista vacía el filtro no bloquea ninguna reseña.',
  leyendaTerminosModeracion: (cantidad: number) =>
    cantidad === 0
      ? 'Sin términos cargados: el filtro está desactivado.'
      : `${String(cantidad)} ${cantidad === 1 ? 'término cargado' : 'términos cargados'}.`,

  campoNombrePlataforma: 'Nombre de la plataforma',
  campoLogo: 'Logo de la plataforma',
  logoAyuda: 'JPG, PNG o WEBP de hasta 2 MB.',
  logoQuitar: 'Quitar logo',
  /** [PROPIO] US-AYU-04, horario que se muestra al usuario en "Contacto del soporte". */
  campoHorarioAtencionSoporte: 'Horario de atención del soporte',
  /** [PROPIO] Ayuda del selector de días y horas del horario de atención. */
  ayudaHorarioAtencion:
    'Marcá los días en los que la plataforma atiende y su tramo horario. Los días sin marcar se muestran cerrados.',
  /** [PROPIO] Rótulo del campo de hora de apertura de un día. */
  apertura: 'Apertura',
  /** [PROPIO] Rótulo del campo de hora de cierre de un día. */
  cierre: 'Cierre',
  logoSubiendo: 'Subiendo logo…',
  logoSeleccionar: 'Elegir logo',
  campoCorreoSoporte: 'Correo de contacto de soporte',

  /** LITERAL - US-CFG-03, botón que abre la restauración de la sección. */
  restaurar: 'Restaurar valores por defecto',

  /** [PROPIO] Título corto del diálogo; el mensaje completo es el literal de RF057. */
  dialogoGuardarTitulo: 'Guardar cambios',
  /** LITERAL - US-CFG-03: "Botones 'Sí, guardar' y 'No, volver'". */
  confirmarGuardarSi: 'Sí, guardar',

  /** [PROPIO] La documentación no fija el texto de esta confirmación (a diferencia de la de guardar). */
  dialogoRestaurarTitulo: 'Restaurar valores por defecto',
  confirmarRestaurarSi: 'Restaurar',
} as const;

/** PAN-ADM-04 · Términos y condiciones — US-CFG-04. */
export const TEXTOS_TERMINOS = {
  /** LITERAL - US-CFG-04: "una pantalla con dos pestañas: 'Términos y condiciones' y 'Política de privacidad'". */
  solapaTerminos: 'Términos y condiciones',
  solapaPrivacidad: 'Política de privacidad',

  fechaPublicacion: 'Fecha de publicación',
  publicadoPor: 'Publicado por',
  autorDesconocido: 'Administrador dado de baja',

  /** LITERAL - US-CFG-04, botones de la vista vigente. */
  accionEditar: 'Editar',
  accionVerHistorial: 'Ver historial',

  /** LITERAL - US-CFG-04, botones del editor. */
  botonPublicar: 'Publicar nueva versión',
  botonGuardarBorrador: 'Guardar borrador',

  /** [PROPIO] Aviso de que se está retomando un borrador propio, no la versión vigente. */
  editandoBorrador: 'Estás retomando el borrador que guardaste.',

  dialogoPublicarTitulo: 'Publicar nueva versión',

  historialTitulo: 'Historial de versiones',
  columnaVersion: 'VERSIÓN',
  columnaFecha: 'FECHA',
  columnaAdmin: 'ADMINISTRADOR',
  columnaAccion: '',
  /** LITERAL - US-CFG-04, enlace de cada fila del historial. */
  verContenido: 'Ver contenido',
  dialogoContenidoTitulo: 'Contenido de la versión',

  /** [PROPIO] Estado vacío antes de la primera publicación de este documento. */
  sinVersionVigente: 'Todavía no se publicó ninguna versión de este documento.',
} as const;

/** Estados transversales de cualquier pantalla con datos. */
export const TEXTOS_ESTADO = {
  reintentar: 'Reintentar',
  /** [PROPIO] Título del estado de error, sobre el mensaje que trae la API. */
  errorTitulo: 'No pudimos cargar esta información',
  cargando: 'Cargando…',
  /** [PROPIO] Pantalla de verificación de sesión previa al panel. */
  verificandoSesion: 'Verificando tu sesión…',
} as const;

/** Módulos del panel que todavía no se codifican. */
export const TEXTOS_PROXIMAMENTE = {
  etiqueta: 'Próximamente',
  /** [PROPIO] Explicación única de las pantallas no implementadas. */
  descripcion:
    'Esta pantalla forma parte del alcance del proyecto y todavía no se codificó. Su maquetación está aprobada en la Etapa 5.',
  pantalla: 'Pantalla',
  modulo: 'Módulo',
  historias: 'Historias de usuario',
} as const;

/** PAN-ADM-02 · Bandeja de moderación de reseñas — US-RES-06, RF086. */
export const TEXTOS_MODERACION = {
  titulo: 'Moderación de contenido',

  /** [PROPIO] Contador del encabezado. */
  resumen: (cantidad: number) =>
    cantidad === 1
      ? '1 reseña reportada pendiente'
      : `${String(cantidad)} reseñas reportadas pendientes`,

  /** [PROPIO] Rótulos de la ficha de cada reporte. */
  cantidadReportes: (cantidad: number) =>
    cantidad === 1 ? '1 reporte' : `${String(cantidad)} reportes`,
  sinPendientes: 'No hay reportes pendientes de revisión.',
  motivos: 'Motivos',
  detalles: 'Detalles aportados',
  sinDetalles: 'Sin detalles adicionales.',
  sinComentario: 'La reseña no tiene comentario.',
  plato: 'Plato',
  cocinero: 'Cocinero',
  /**
   * [PROPIO] Qué se reseñó. La cola de moderación recibe los tres tipos desde
   * que comparten tabla, y el administrador necesita distinguirlos: no es lo
   * mismo ocultar una opinión sobre un plato que una sobre una persona.
   */
  tipoDeResena: {
    PLATO: 'Reseña de un plato',
    COCINERO: 'Reseña a un cocinero',
    CLIENTE: 'Reseña a un cliente',
  },

  autor: 'Autor de la reseña',
  primerReporte: 'Primer reporte',

  /**
   * [PROPIO] Las dos acciones de RF086. El requisito describe las ramas
   * ("aprobación del reporte", "rechazo del reporte") pero no rotula los
   * botones. Se nombran por lo que le pasa a la RESEÑA y no al reporte:
   * "aprobar" es ambiguo cuando lo que se aprueba es una denuncia.
   */
  ocultar: 'Ocultar reseña',
  mantener: 'Dejarla visible',

  /** [PROPIO] Confirmación previa: las dos ramas son difíciles de deshacer. */
  confirmarOcultarTitulo: '¿Ocultar esta reseña?',
  confirmarOcultar:
    'La reseña deja de verse en el perfil del cocinero y en el detalle del plato, y sale de los dos promedios.',
  confirmarMantenerTitulo: '¿Dejar la reseña visible?',
  confirmarMantener:
    'La reseña se mantiene publicada y los reportes quedan resueltos. No va a volver a aparecer en esta bandeja.',
  confirmar: 'Confirmar',
  cancelar: 'Cancelar',
} as const;

/**
 * Pestañas de PAN-ADM-02 y moderación de publicaciones (US-ADM-04). Todos
 * PROPIOS: la historia no fija textos de interfaz.
 */
export const TEXTOS_MODERACION_PUBLICACIONES = {
  pestanaPublicaciones: 'Publicaciones',
  pestanaResenas: 'Reseñas reportadas',
  subtitulo: 'Publicaciones de los cocineros y reseñas denunciadas',

  resumen: (cantidad: number) =>
    cantidad === 1
      ? '1 publicación activa'
      : `${cantidad.toLocaleString('es-AR')} publicaciones activas`,

  buscar: 'Buscar por plato o cocinero…',
  buscarEtiqueta: 'Buscar publicaciones',
  filtroCategoria: 'Categoría',
  filtroEstado: 'Estado',
  todas: 'Todas',
  todos: 'Todos',
  limpiarFiltros: 'Limpiar filtros',
  vacioSinFiltros: 'No hay publicaciones activas en la plataforma.',

  columnaPlato: 'Plato',
  columnaCocinero: 'Cocinero',
  columnaCategoria: 'Categoría',
  columnaPrecio: 'Precio',
  columnaEstado: 'Estado',
  columnaCreacion: 'Creación',
  columnaAcciones: 'Acciones',

  verDetalle: 'Ver detalle',
  verDetalleDe: (plato: string) => `Ver el detalle de ${plato}`,
  eliminarDe: (plato: string) => `Eliminar ${plato}`,

  detalleTitulo: 'Detalle de la publicación',
  descripcion: 'Descripción',
  sinDescripcion: 'Sin descripción.',
  sinImagen: 'Sin imagen',
  cerrar: 'Cerrar',
  eliminar: 'Eliminar publicación',

  dialogoEliminarTitulo: '¿Eliminar esta publicación?',
  dialogoEliminarAviso:
    'Deja de mostrarse a los clientes. Los pedidos ya confirmados con este plato siguen su curso.',
  motivo: 'Motivo de la eliminación',
  motivoPlaceholder: 'Explicá qué política infringe la publicación',
  caracteres: (usados: number, maximo: number) =>
    `${String(usados)}/${String(maximo)}`,
} as const;

/**
 * PAN-ADM-03 · Métricas del sistema (US-ADM-05). Rótulos del mockup
 * `ADM-03.jpg`; el resto es PROPIO (la historia no fija textos de interfaz).
 */
export const TEXTOS_METRICAS = {
  titulo: 'Métricas del sistema',
  actualizado: (hace: string) => `Última actualización: ${hace}`,
  recienActualizado: 'recién',
  haceMinutos: (minutos: number) =>
    minutos === 1 ? 'hace 1 min' : `hace ${String(minutos)} min`,

  periodo: 'Período',
  periodoSemana: 'Semana',
  periodoMes: 'Mes',
  periodoAnio: 'Año',
  periodoPersonalizado: 'Personalizado',
  desde: 'Desde',
  hasta: 'Hasta',
  exportarPdf: 'Exportar PDF',

  usuariosActivos: 'Usuarios activos',
  cocinerosActivos: 'Cocineros activos',
  pedidosCompletados: 'Pedidos completados',
  publicacionesActivas: 'Publicaciones activas',
  variacion: (valor: number) =>
    `${valor > 0 ? '+' : ''}${valor.toLocaleString('es-AR')}%`,
  variacionContra: 'respecto del período anterior',

  graficoPedidos: 'Pedidos por período',
  subtituloSerie: {
    SEMANA: 'Por día',
    MES: 'Por semana',
    ANIO: 'Por mes',
    PERSONALIZADO: 'Período personalizado',
  },
  seriePedidos: 'Pedidos',
  serieCompletados: 'Completados',

  usuariosPorRol: 'Usuarios por rol',
  total: 'Total',
  rol: {
    CLIENTE: 'Clientes',
    COCINERO: 'Cocineros',
    ADMINISTRADOR: 'Admin',
  },

  pedidosPorEstado: 'Pedidos por estado',
  pedidosRealizados: 'Pedidos realizados',

  actividadReciente: 'Actividad reciente',
  verHistorial: 'Ver historial completo →',
  columnaAccion: 'Acción',
  columnaUsuario: 'Usuario',
  columnaDetalle: 'Detalle',
  columnaFecha: 'Fecha y hora',
  sistema: 'Sistema',
  sinActividad: 'Todavía no hay actividad registrada.',

  reporteTitulo: 'Reporte de métricas · REP-02',
  reportePeriodo: (desde: string, hasta: string) =>
    `Período: ${desde} al ${hasta}`,
  reporteEmitido: (fecha: string) => `Emitido el ${fecha}`,
} as const;

/**
 * Inicio del panel. Sin código PAN: la maquetación no lo define (decisión del
 * equipo, pantalla libre). Textos PROPIOS.
 */
export const TEXTOS_INICIO = {
  saludo: (nombre: string) => `Hola, ${nombre}`,
  resumenDelMes: 'Resumen del mes',
  verMetricas: 'Ver métricas',
  pendientes: 'Para revisar',
  resenasReportadas: (cantidad: number) =>
    cantidad === 1
      ? '1 reseña reportada sin resolver'
      : `${String(cantidad)} reseñas reportadas sin resolver`,
  sinResenasReportadas: 'No hay reseñas reportadas pendientes',
  revisarModeracion: 'Ir a Moderación',
  accesosRapidos: 'Accesos rápidos',
  descripcion: {
    '/usuarios': 'Cuentas, roles, suspensiones y bajas.',
    '/moderacion': 'Publicaciones y reseñas reportadas.',
    '/avisos': 'Notificaciones push a clientes y cocineros.',
    '/metricas': 'Indicadores de uso y reporte REP-02.',
    '/auditoria': 'Operaciones y eventos de seguridad.',
    '/ayuda': 'Manual de usuario y preguntas frecuentes.',
    '/configuracion': 'Categorías, motivos, parámetros y términos.',
  } as Readonly<Record<string, string>>,
} as const;

/**
 * Avisos generales — US-NOT-04 / RF037. La historia no tiene pantalla PAN ni
 * fija textos de interfaz: todos son PROPIOS (decisión del equipo del
 * 13/10/2026). Los de validación del servidor están en `MENSAJES_AVISO`.
 */
export const TEXTOS_AVISOS = {
  titulo: 'Avisos generales',
  subtitulo: 'Enviá una notificación push a los usuarios de la aplicación.',

  destinatario: 'Destinatario',
  destinatarios: {
    TODOS: 'Todos los usuarios',
    CLIENTE: 'Solo clientes',
    COCINERO: 'Solo cocineros',
  },
  tituloAviso: 'Título',
  tituloPlaceholder: 'Por ejemplo: Mantenimiento programado',
  mensaje: 'Mensaje',
  mensajePlaceholder: 'Escribí el texto completo del aviso.',
  caracteres: (usados: number, maximo: number) =>
    `${String(usados)}/${String(maximo)}`,

  ayuda:
    'El aviso llega como notificación push a las cuentas activas del destinatario elegido y queda en su historial de notificaciones. No se puede desactivar ni deshacer.',

  enviar: 'Enviar aviso',

  confirmarTitulo: '¿Enviar este aviso?',
  confirmarMensaje: (destinatario: string) =>
    `Se va a enviar como notificación push a: ${destinatario}. Una vez enviado no se puede deshacer.`,
  confirmar: 'Sí, enviar',
  volver: 'No, volver',

  enviado: (cantidad: number) =>
    cantidad === 1
      ? 'Aviso enviado a 1 usuario.'
      : `Aviso enviado a ${cantidad.toLocaleString('es-AR')} usuarios.`,
  sinDestinatarios: 'No hay cuentas activas para el destinatario elegido.',
} as const;
