/**
 * Mensajes que ve el usuario final, centralizados en un unico lugar.
 *
 * POR QUE VIVEN ACA Y NO EN CADA PANTALLA
 *
 * Los criterios de aceptacion de la documentacion de proyecto fijan textos
 * exactos ("Las contrasenas no coinciden.", "Tu cuenta se encuentra
 * suspendida. Contacta al soporte."). Las pruebas funcionales de la Etapa 6 los
 * verifican palabra por palabra. Si cada formulario escribiera el suyo, el
 * mensaje del servidor y el del cliente se irian separando sin que nadie lo
 * note hasta la evaluacion.
 *
 * DOS CATEGORIAS DE MENSAJE, Y LA DIFERENCIA IMPORTA
 *
 *   LITERAL   transcrito de un criterio de aceptacion. Cambiar una tilde o un
 *             punto final rompe la trazabilidad con el documento. Cada uno
 *             lleva anotada su US.
 *   PROPIO    la documentacion pide "un mensaje de error" sin fijar el texto.
 *             Lo redactamos nosotros y queda anotado como tal, para que se
 *             distinga de lo que si esta comprometido.
 *
 * Nota sobre "Este correo ya esta registrado": va sin tilde y sin punto final
 * a proposito. Asi esta escrito en el criterio de aceptacion de US-AUT-01 y la
 * decision del equipo fue respetar el documento por sobre la maquetacion
 * cuando difieren.
 */

/** Modulo de Autenticacion y Control de Acceso (US-AUT-01 a US-AUT-05). */
export const MENSAJES_AUTH = {
  /** LITERAL - US-AUT-01, correo ya existente en el registro de cliente. */
  correoDuplicadoCliente: 'Este correo ya esta registrado',

  /**
   * LITERAL - US-AUT-02, correo ya existente en el registro de cocinero.
   * Es distinto al de US-AUT-01 en el documento; no unificarlos.
   */
  correoDuplicadoCocinero:
    'Ya existe una cuenta registrada con este correo electrónico.',

  /** LITERAL - US-AUT-01, US-AUT-02 y US-AUT-04. */
  contrasenasNoCoinciden: 'Las contraseñas no coinciden.',

  /**
   * LITERAL - US-AUT-03. No revela cual de los dos datos fallo: hacerlo
   * permitiria enumerar que correos tienen cuenta en la plataforma.
   */
  credencialesInvalidas:
    'Correo electrónico o contraseña ingresados son incorrectos.',

  /** LITERAL - US-AUT-03, cuenta suspendida por un administrador. */
  cuentaSuspendida: 'Tu cuenta se encuentra suspendida. Contactá al soporte.',

  /** LITERAL - US-AUT-04, el correo existe y se envio el enlace. */
  enlaceRecuperacionEnviado:
    'Te enviamos un enlace para restablecer tu contraseña.',

  /** LITERAL - US-AUT-04, el correo no corresponde a ninguna cuenta. */
  correoNoRegistrado: 'No existe una cuenta asociada a ese correo electrónico.',

  /** PROPIO - US-GURP-04 y US-GURP-09: la cuenta existe pero fue dada de baja. */
  cuentaEliminada: 'Esta cuenta no se encuentra habilitada.',

  /** PROPIO - US-AUT-03, la sesion vencio mientras se usaba la aplicacion. */
  sesionExpirada: 'Tu sesión expiró. Iniciá sesión nuevamente.',

  /** PROPIO - no hay token en una pantalla protegida. */
  sesionRequerida: 'Iniciá sesión para continuar.',
} as const;

/** Validaciones de formulario comunes a varios modulos. */
export const MENSAJES_VALIDACION = {
  /** LITERAL - US-AUT-01, longitud minima de la contrasena. */
  contrasenaCorta: 'La contraseña debe tener al menos 8 caracteres.',

  /** LITERAL - maquetacion PAN-AUT-01, estado de errores de validacion. */
  terminosSinAceptar: 'Debés aceptar los términos para continuar.',

  /** PROPIO - campo obligatorio vacio. */
  campoObligatorio: 'Este campo es obligatorio.',

  /** PROPIO - formato de correo invalido. */
  correoInvalido: 'Ingresá un correo electrónico válido.',
} as const;

/** Modulo de Gestion de Usuarios, Roles y Permisos (US-GURP-01 a US-GURP-10). */
export const MENSAJES_USUARIO = {
  /**
   * PROPIO - US-GURP-01, quinto criterio: "muestre un mensaje de error claro y
   * permita reintentar la consulta".
   */
  perfilNoDisponible:
    'No pudimos cargar tu perfil. Revisá tu conexión e intentá de nuevo.',

  /** PROPIO - US-GURP-02, guardado exitoso. */
  perfilActualizado: 'Guardamos los cambios de tu perfil.',

  /**
   * PROPIO - US-GURP-02, cuarto criterio: "rechace el archivo y muestre un
   * mensaje indicando formato o tamano permitido". El limite de 5 MB y los tres
   * formatos salen del criterio de aceptacion de US-AUT-01.
   */
  imagenInvalida:
    'La imagen debe ser un archivo JPG, PNG o WEBP de hasta 5 MB.',

  /** PROPIO - US-GURP-03, segundo criterio: contrasena actual incorrecta. */
  contrasenaActualIncorrecta: 'La contraseña actual no es correcta.',

  /** PROPIO - US-GURP-03, quinto criterio: "muestre un mensaje de operacion exitosa". */
  contrasenaActualizada: 'Actualizamos tu contraseña.',

  /** PROPIO - US-GURP-03: la nueva contrasena es igual a la vigente. */
  contrasenaNuevaIgualAActual:
    'La nueva contraseña debe ser distinta de la actual.',

  /** PROPIO - US-GURP-04, advertencia previa a la baja de la cuenta propia. */
  advertenciaEliminarCuenta:
    'Si eliminás tu cuenta no vas a poder volver a iniciar sesión ni realizar nuevas operaciones. Tu historial de pedidos y reseñas se conserva.',

  /** PROPIO - US-GURP-04, baja concretada. */
  cuentaEliminada: 'Tu cuenta fue dada de baja.',

  /** PROPIO - US-GURP-06, correo ya usado por otra cuenta. */
  correoYaRegistrado:
    'Ya hay una cuenta registrada con ese correo electrónico.',

  /** PROPIO - US-GURP-06, cuarto criterio: rol inexistente o no permitido. */
  rolInvalido: 'El rol seleccionado no es válido.',

  /**
   * PROPIO - US-GURP-07 y US-GURP-09: la operacion dejaria al sistema sin
   * administradores. Es la unica salvaguarda que impide perder el acceso al
   * panel de forma irreversible.
   */
  ultimoAdministrador:
    'Debe existir al menos un administrador activo en el sistema.',

  /** PROPIO - US-GURP-08, tercer criterio: motivo obligatorio al suspender. */
  motivoSuspensionObligatorio: 'Indicá el motivo de la suspensión.',

  /** PROPIO - US-GURP-08, confirmacion de la suspension. */
  usuarioSuspendido: 'La cuenta quedó suspendida.',

  /** PROPIO - US-GURP-08, confirmacion del levantamiento de la suspension. */
  usuarioRehabilitado: 'La cuenta volvió a estado activo.',

  /** PROPIO - US-GURP-09, confirmacion de la baja logica desde el panel. */
  usuarioEliminado: 'La cuenta fue dada de baja.',

  /**
   * PROPIO - US-GURP-09, primer criterio: texto de la ventana de confirmacion,
   * que debe indicar "que la cuenta no podra realizar nuevas operaciones".
   */
  advertenciaEliminarUsuario:
    'La cuenta no va a poder iniciar sesión ni realizar nuevas operaciones. Su historial de pedidos, publicaciones y reseñas se conserva.',

  /** PROPIO - US-GURP-10, cuarto criterio: "mensaje de acceso no autorizado". */
  accesoNoAutorizado: 'No tenés permiso para realizar esta acción.',

  /** PROPIO - US-GURP-01, cuarto criterio: perfil ajeno desde el perfil propio. */
  perfilAjeno: 'Solo podés ver y modificar tu propio perfil.',
} as const;

/** Modulo de Auditoria y Trazabilidad (US-AUD-01 y US-AUD-02). */
export const MENSAJES_AUDITORIA = {
  /** LITERAL - US-AUD-02, cuarto criterio: estado vacio de la tabla. */
  sinResultados:
    'No se encontraron registros de auditoría con los filtros seleccionados.',

  /** PROPIO - accion del estado vacio, exigida por el mismo criterio. */
  limpiarFiltros: 'Limpiar filtros',

  /** PROPIO - estado vacio de la solapa de eventos de seguridad. */
  sinEventosSeguridad:
    'No se encontraron eventos de seguridad con los filtros seleccionados.',
} as const;

/** Errores tecnicos, sin detalle del stack (requisito del modulo de seguridad). */
export const MENSAJES_ERROR = {
  interno: 'Ocurrió un error inesperado. Intentá nuevamente en unos minutos.',
  sinConexion: 'No pudimos conectarnos. Revisá tu conexión a internet.',
  demasiadasSolicitudes: 'Hiciste demasiadas solicitudes. Esperá un momento.',
  noEncontrado: 'No encontramos lo que buscabas.',
} as const;
