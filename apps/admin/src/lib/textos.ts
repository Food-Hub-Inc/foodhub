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
  /** [PROPIO] Aclara que el panel no es para clientes ni cocineros. */
  soloAdministradores:
    'El acceso al panel está reservado a las cuentas con rol de administrador.',
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
  exportar: 'Exportar CSV',
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
   * [PROPIO] `docs/API-TRANSVERSALES.md` no define un endpoint de exportación
   * para el listado de usuarios; solo el módulo de auditoría tiene
   * `/auditoria/exportar`. El botón queda visible como en la maquetación pero
   * inactivo, en vez de inventar una ruta que la API no expone.
   */
  exportarNoDisponible:
    'La exportación del listado de usuarios todavía no está disponible.',
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
