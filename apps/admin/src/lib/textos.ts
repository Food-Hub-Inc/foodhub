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
  notificaciones: 'Notificaciones',
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

  campoNombrePlataforma: 'Nombre de la plataforma',
  campoLogo: 'Logo de la plataforma',
  logoAyuda: 'JPG, PNG o WEBP de hasta 2 MB.',
  logoQuitar: 'Quitar logo',
  /** [PROPIO] US-AYU-04, horario que se muestra al usuario en "Contacto del soporte". */
  campoHorarioAtencionSoporte: 'Horario de atención del soporte',
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
