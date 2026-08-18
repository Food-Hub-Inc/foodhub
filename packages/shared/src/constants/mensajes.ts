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

  /**
   * PROPIO - el JWT es valido pero no hay fila en `usuario`.
   *
   * Solo puede pasar si el alta se corto entre la creacion de la cuenta en
   * GoTrue y la del perfil. El registro compensa ese caso borrando la cuenta,
   * asi que llegar aca indica una interrupcion que ni siquiera la compensacion
   * alcanzo a manejar.
   */
  perfilIncompleto: 'Tu cuenta no está completa.',
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

  /**
   * PROPIO - US-GURP-06, quinto criterio: la cuenta se crea y aparece en el
   * listado. El alta es por invitacion, asi que el mensaje tiene que decir que
   * la cuenta todavia no esta operativa: el administrador no puede quedarse
   * esperando que la persona ingrese sin haber recibido el correo.
   */
  usuarioCreado:
    'Creamos la cuenta y le enviamos un correo para que defina su contraseña.',

  /** PROPIO - US-GURP-07, confirmacion de la edicion desde el panel. */
  usuarioActualizado: 'Guardamos los cambios de la cuenta.',

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

/**
 * Modulo de Publicaciones (US-PUB-01 a US-PUB-05).
 *
 * Los textos de validacion de imagen y de precio, los cinco modales de
 * confirmacion (publicar, cancelar-crear, guardar cambios, cancelar-editar,
 * eliminar) con sus titulos, mensajes y botones, los tres mensajes de exito,
 * el rechazo por pedidos activos y los dos estados vacios del listado
 * transcriben caracter por caracter la tabla de criterios de aceptacion de
 * `MOD_PUBLICACIONES.md`. "Este campo es obligatorio" (US-PUB-01) no se
 * repite aca: es el mismo mensaje que `MENSAJES_VALIDACION.campoObligatorio`
 * ya usan otros formularios del sistema, y fragmentarlo en una variante propia
 * de este modulo solo por una diferencia de puntuacion en la transcripcion del
 * documento (que carece del punto final que si lleva la constante existente)
 * dejaria dos mensajes que dicen lo mismo divergiendo con el tiempo.
 */
export const MENSAJES_PUBLICACION = {
  // --- Validacion del formulario de plato (US-PUB-01) -----------------------
  /** LITERAL - US-PUB-01, imagen fuera de formato o de tamaño. */
  imagenInvalida:
    'El archivo debe ser una imagen JPG, PNG o WEBP de hasta 5 MB',

  /** LITERAL - US-PUB-01, precio igual a 0 o negativo. */
  precioInvalido: 'El precio debe ser mayor a 0',

  // --- Confirmar publicacion (US-PUB-01) -------------------------------------
  /** LITERAL - US-PUB-01, título del modal de confirmación al crear. */
  confirmarPublicarTitulo: '¿Confirmás la publicación del plato?',

  /** LITERAL - US-PUB-01, mensaje del modal de confirmación al crear. */
  confirmarPublicarMensaje:
    "El plato quedará visible para los clientes con estado 'Disponible'.",

  /** LITERAL - US-PUB-01, botón que confirma la publicación. */
  confirmarPublicarBotonConfirmar: 'Sí, publicar',

  /** LITERAL - US-PUB-01, botón que vuelve al formulario sin publicar. */
  confirmarPublicarBotonCancelar: 'No, volver',

  /** LITERAL - US-PUB-01, éxito de la creación. */
  publicacionCreada: '¡Publicación creada con éxito!',

  // --- Cancelar la creación con datos cargados (US-PUB-01) -------------------
  /** LITERAL - US-PUB-01, mensaje al presionar "Cancelar" en el alta. */
  cancelarCreacionMensaje:
    '¿Está seguro de que desea volver? Los cambios no se guardarán',

  /** LITERAL - US-PUB-01, botón que descarta el formulario de alta. */
  cancelarCreacionBotonConfirmar: 'Sí, volver',

  /** LITERAL - US-PUB-01, botón que vuelve a editar el formulario de alta. */
  cancelarCreacionBotonCancelar: 'No, cerrar',

  // --- Confirmar edición (US-PUB-02) ------------------------------------------
  /** LITERAL - US-PUB-02, título del modal de confirmación al editar. */
  confirmarEdicionTitulo: '¿Confirmás los cambios realizados?',

  /** LITERAL - US-PUB-02, botón que confirma los cambios. */
  confirmarEdicionBotonConfirmar: 'Sí, guardar',

  /** LITERAL - US-PUB-02, botón que vuelve al formulario sin guardar. */
  confirmarEdicionBotonCancelar: 'No, volver',

  /** LITERAL - US-PUB-02, éxito del guardado. */
  cambiosGuardados: '¡Cambios guardados con éxito!',

  // --- Cancelar la edición con cambios pendientes (US-PUB-02) ----------------
  /** LITERAL - US-PUB-02, mensaje al presionar "Cancelar" en la edición. */
  cancelarEdicionMensaje:
    'Los cambios realizados no se guardarán. ¿Está seguro de que desea volver?',

  /** LITERAL - US-PUB-02, botón que descarta la edición. */
  cancelarEdicionBotonConfirmar: 'Sí, volver',

  /** LITERAL - US-PUB-02, botón que vuelve a editar el formulario. */
  cancelarEdicionBotonCancelar: 'No, cerrar',

  // --- Eliminar (US-PUB-03) ----------------------------------------------------
  /** LITERAL - US-PUB-03, título del modal de confirmación de baja. */
  confirmarEliminarTitulo: '¿Eliminar publicación?',

  /**
   * LITERAL - US-PUB-03, mensaje del modal de confirmación de baja. El
   * criterio de aceptación marca el nombre del plato como
   * "[Nombre del plato]"; esta función interpola el valor real en ese lugar
   * y conserva las comillas simples que rodean al placeholder en el documento.
   */
  confirmarEliminarMensaje: (nombrePlato: string) =>
    `Esta acción no se puede deshacer. La publicación '${nombrePlato}' dejará de ser visible para los clientes.`,

  /** LITERAL - US-PUB-03, botón que confirma la baja (color rojo en la UI). */
  confirmarEliminarBotonConfirmar: 'Sí, eliminar',

  /** LITERAL - US-PUB-03, botón que vuelve sin eliminar. */
  confirmarEliminarBotonCancelar: 'No, volver',

  /**
   * LITERAL - US-PUB-03, éxito de la baja. Sin signos de exclamación a
   * diferencia de `publicacionCreada` y `cambiosGuardados`: así está escrito
   * en el criterio de aceptación, y esta constante respeta el documento tal
   * como está redactado en vez de uniformar el estilo por su cuenta.
   */
  publicacionEliminada: 'Publicación eliminada con éxito',

  /**
   * LITERAL - US-PUB-03, intento de baja con pedidos en estado "Creado",
   * "Aceptado" o "Listo".
   */
  pedidosActivosNoEliminable:
    'No se puede eliminar una publicación con pedidos activos. Finalice o rechace los pedidos pendientes antes de eliminarla.',

  // --- Estados vacíos del listado (US-PUB-05) ---------------------------------
  /** LITERAL - US-PUB-05, título del estado vacío sin publicaciones propias. */
  sinPublicacionesTitulo: 'Aún no tenés publicaciones',

  /** LITERAL - US-PUB-05, subtítulo del estado vacío sin publicaciones propias. */
  sinPublicacionesSubtitulo:
    "Presioná 'Nueva publicación' para crear tu primer plato",

  /** LITERAL - US-PUB-05, búsqueda o filtros combinados sin coincidencias. */
  sinResultados:
    'No se encontraron publicaciones con esos criterios. Probá modificar los filtros o la búsqueda.',
} as const;

/** Modulo de Configuracion y parametros (US-CFG-01 a US-CFG-06). */
export const MENSAJES_CONFIGURACION = {
  /** LITERAL - US-CFG-01, campo obligatorio del formulario de categoria. */
  campoObligatorio: 'Este campo es obligatorio',

  /** LITERAL - US-CFG-01, alta exitosa de una categoria. */
  categoriaCreada: 'Categoría creada con éxito',

  /** LITERAL - US-CFG-01, nombre de categoria ya usado (por otra activa). */
  nombreCategoriaDuplicado: 'Ya existe una categoría con ese nombre',

  /**
   * LITERAL - US-CFG-01, texto de la ventana de confirmacion al deshabilitar.
   * `nombre` se interpola porque el criterio de aceptacion pide el nombre
   * concreto de la categoria en el titulo: "¿Deshabilitar la categoría
   * '[Nombre]'?".
   */
  confirmarDeshabilitarCategoria: (nombre: string) =>
    `¿Deshabilitar la categoría '${nombre}'?`,
  advertenciaDeshabilitarCategoria:
    'Los cocineros no podrán asignar esta categoría a nuevas publicaciones. Las publicaciones existentes con esta categoría no se verán afectadas.',

  /** LITERAL - US-CFG-01, borrado bloqueado por publicaciones asociadas. */
  categoriaConPublicacionesAsociadas:
    'No se puede eliminar una categoría con publicaciones asociadas. Puede deshabilitarla para que no esté disponible en nuevas publicaciones.',

  /** PROPIO - US-CFG-01, imagen de categoria fuera de formato o tamano (RF054: 2 MB). */
  imagenCategoriaInvalida:
    'La imagen debe ser un archivo JPG, PNG o WEBP de hasta 2 MB.',

  /** PROPIO - US-CFG-01, confirmacion de la edicion de una categoria. */
  categoriaActualizada: 'Guardamos los cambios de la categoría.',

  /** PROPIO - US-CFG-01, confirmacion de habilitar/deshabilitar. */
  categoriaHabilitada: 'La categoría vuelve a estar disponible.',
  categoriaDeshabilitada: 'La categoría quedó deshabilitada.',

  /** PROPIO - US-CFG-01, confirmacion de la eliminación física. */
  categoriaEliminada: 'Eliminamos la categoría.',

  // --- US-CFG-02 · Motivos de cancelación de pedido -----------------------

  /**
   * PROPIO - US-CFG-02: RF056 exige nombre unico pero, a diferencia de
   * US-CFG-01, el documento no fija el texto del error.
   */
  nombreMotivoDuplicado: 'Ya existe un motivo con ese nombre.',

  /** PROPIO - US-CFG-02, alta exitosa (RF056 no fija un texto de confirmación). */
  motivoCreado: 'Motivo creado con éxito.',

  /**
   * LITERAL - US-CFG-02, texto único de confirmación (título y mensaje en
   * una sola oración, a diferencia de US-CFG-01 que los separa).
   */
  confirmarDeshabilitarMotivo:
    'Al deshabilitar este motivo, ya no aparecerá como opción rápida en los flujos de cancelación. ¿Confirma la acción?',

  /** PROPIO - US-CFG-02, confirmación de la edición. */
  motivoActualizado: 'Guardamos los cambios del motivo.',

  /**
   * PROPIO - US-CFG-02: RF056 solo detalla el flujo de deshabilitar: habilitar
   * es simétrico y sigue, sin criterio propio, el mismo criterio "sin
   * solicitar confirmación" de US-CFG-01.
   */
  motivoHabilitado:
    'El motivo vuelve a estar disponible en los flujos de cancelación.',
  motivoDeshabilitado: 'El motivo quedó deshabilitado.',

  // --- US-CFG-03 · Parámetros generales del sistema -----------------------

  /**
   * LITERAL - US-CFG-03, ventana de confirmación al guardar cualquier
   * sección de parámetros.
   */
  confirmarGuardarParametros:
    'Los nuevos parámetros se aplicarán de forma inmediata a toda la plataforma. ¿Confirma los cambios?',

  /** PROPIO - US-CFG-03: la documentación no fija el texto de esta confirmación. */
  confirmarRestaurarParametros:
    'Los parámetros de esta sección volverán a sus valores predefinidos de fábrica. ¿Confirma la acción?',

  /** PROPIO - US-CFG-03, confirmación del guardado. */
  parametrosActualizados: 'Guardamos los nuevos parámetros.',

  /** PROPIO - US-CFG-03, confirmación de la restauración. */
  parametrosRestaurados: 'Restauramos los valores predefinidos de fábrica.',

  // --- US-CFG-04 · Términos y condiciones ----------------------------------

  /** PROPIO - US-CFG-04, confirmación de "Guardar borrador". */
  borradorGuardado: 'Guardamos el borrador.',

  /**
   * LITERAL - US-CFG-04, RF058: ventana de confirmación al publicar una
   * nueva versión.
   */
  confirmarPublicarTerminos:
    'Al publicar esta nueva versión, todos los usuarios deberán aceptar nuevamente los términos en su próximo inicio de sesión. Esta acción no se puede deshacer. ¿Confirma la publicación?',
  /** LITERAL - US-CFG-04: "Botones 'Sí, publicar' y 'No, volver'". */
  confirmarPublicarSi: 'Sí, publicar',

  /** PROPIO - US-CFG-04, confirmación de la publicación. */
  versionPublicada: 'La nueva versión quedó publicada.',

  /**
   * LITERAL - US-CFG-04, sexto criterio: checkbox obligatorio de la app móvil
   * al iniciar sesión después de una publicación nueva.
   */
  aceptoNuevosTerminos:
    'Acepto los nuevos términos y condiciones y la política de privacidad',

  /** PROPIO - US-CFG-04, sexto criterio: confirmación tras aceptar (RF058 no fija un texto). */
  terminosAceptados: 'Aceptaste los nuevos términos y condiciones.',

  // --- US-CFG-05 · Preferencias de notificaciones --------------------------

  /**
   * LITERAL - US-CFG-05, RF059: tooltip del ícono informativo junto a un
   * switch deshabilitado (notificación esencial).
   */
  notificacionEsencial:
    'Esta notificación es esencial para la operación de la plataforma y no puede desactivarse.',

  /** LITERAL - US-CFG-05, RF059: toast al cambiar cualquier switch habilitado. */
  preferenciaActualizada: 'Preferencia actualizada',
} as const;

/** Errores tecnicos, sin detalle del stack (requisito del modulo de seguridad). */
export const MENSAJES_ERROR = {
  interno: 'Ocurrió un error inesperado. Intentá nuevamente en unos minutos.',
  sinConexion: 'No pudimos conectarnos. Revisá tu conexión a internet.',
  demasiadasSolicitudes: 'Hiciste demasiadas solicitudes. Esperá un momento.',
  noEncontrado: 'No encontramos lo que buscabas.',
} as const;
