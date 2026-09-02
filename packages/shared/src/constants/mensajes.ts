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

/**
 * Mensajes literales de US-AYU-02. Se comparten para que la app no altere la
 * redacción que luego verifican las pruebas funcionales.
 */
export const MENSAJES_AYUDA = {
  preguntaUtil: '¿Te resultó útil esta respuesta?',
  votoUtil: 'Sí',
  votoNoUtil: 'No',
  graciasPorTuOpinion: 'Gracias por tu opinión',
  sinResultados: 'No encontramos preguntas que coincidan con tu búsqueda.',
  contactarSoporte: 'Contactar al soporte',

  /**
   * US-AYU-04 - Informacion legal y datos de contacto (PAN-AYU-04).
   *
   * No todos los textos son literales de la tabla de criterios: la
   * documentacion describe el comportamiento sin fijar cada palabra, asi que
   * los que el equipo tuvo que redactar quedan marcados con [PROPIO]. Los que
   * si lo son llevan el comentario "LITERAL - ..." que sigue el mismo formato
   * que el resto del archivo.
   */
  indiceLegal: {
    /** [PROPIO] Titulo del sub-hub "Informacion legal" dentro del hub AYU. */
    titulo: 'Información legal',
    /** [PROPIO] Bajada del sub-hub. */
    bajada:
      'Accedé a los términos y condiciones, la política de privacidad y los datos de contacto de FoodHub.',
    terminos: {
      /** [PROPIO] Etiqueta de la fila del sub-hub. */
      titulo: 'Términos y condiciones',
      /** [PROPIO] Descripcion breve de la fila del sub-hub. */
      descripcion: 'El texto vigente que rige tu uso de la plataforma.',
    },
    privacidad: {
      /** [PROPIO] */
      titulo: 'Política de privacidad',
      /** [PROPIO] */
      descripcion:
        'Cómo tratamos tus datos personales y tu información en FoodHub.',
    },
    contacto: {
      /** [PROPIO] Etiqueta de la fila del sub-hub. */
      titulo: 'Contacto del soporte',
      /** [PROPIO] */
      descripcion:
        'El correo oficial, los horarios de atención y el formulario de contacto.',
    },
  },
  documentoLegal: {
    /**
     * Leyenda del encabezado de PAN-AYU-04 cuando el documento tiene una
     * fecha de publicacion. Es [PROPIO] porque el criterio pide "fecha de
     * ultima actualizacion" sin fijar el formato.
     */
    ultimaActualizacion: (fecha: string) => `Última actualización: ${fecha}`,
    /** [PROPIO] Etiqueta accesible del boton "Descargar PDF" en la barra superior. */
    descargarPdf: 'Descargar PDF',
    /** [PROPIO] Estado del boton mientras se genera y descarga el PDF. */
    descargandoPdf: 'Descargando…',
    /**
     * LITERAL - US-AYU-04, error al no poder generar o descargar el PDF.
     * Coherente con el resto de los mensajes de error: explica que paso
     * sin detalle tecnico y ofrece una salida (reintentar).
     */
    errorPdf:
      'No pudimos generar el PDF. Revisá tu conexión e intentá nuevamente.',
  },
  contacto: {
    /** [PROPIO] Titulo de la pantalla de contacto. */
    titulo: 'Contacto del soporte',
    /** [PROPIO] Etiqueta del bloque con el correo electronico oficial. */
    correoTitulo: 'Correo electrónico',
    /** [PROPIO] Etiqueta del bloque con los horarios de atencion. */
    horarioTitulo: 'Horarios de atención',
    /**
     * LITERAL - US-AYU-04, accion que abre el formulario de contacto
     * interno (US-AYU-03). Reaprovecha la cadena que ya define
     * `contactarSoporte` para que las pruebas funcionales no verifiquen dos
     * copias del mismo texto.
     */
    irAlFormulario: 'Contactar al soporte',
    /** [PROPIO] Validacion server-side: el horario no puede estar vacio. */
    horarioVacio: 'El horario de atención no puede estar vacío.',
  },

  /**
   * US-AYU-03 - Formulario de envio de consulta, sugerencia o reporte
   * (PAN-AYU-03). La pantalla carga el correo del usuario como solo
   * lectura desde la sesion; los tres campos de texto son obligatorios
   * y los adjuntos son opcionales, hasta tres, en formato JPG/PNG/PDF
   * de hasta 5 MB.
   *
   * Los mensajes del criterio se transcriben como `LITERAL`; los que la
   * documentacion no fija quedan como `PROPIO` y se distinguen en la
   * declaracion. La lista de los CUATRO tipos de consulta se conserva
   * como bloque aparte (`tTipoConsulta`) porque la UI la consume tal
   * cual y porque sumarla como cuatro claves sueltas en este bloque
   * impediria tipar el `CampoDesplegable` que las muestra.
   */
  consulta: {
    /** [PROPIO] Titulo de la pantalla del formulario (PAN-AYU-03). */
    titulo: 'Contactar al soporte',

    /** [PROPIO] Etiqueta del correo del usuario, mostrado como solo lectura. */
    correoTitulo: 'Tu correo electrónico',

    /** [PROPIO] Etiqueta del desplegable de tipo de consulta. */
    etiquetaTipoConsulta: 'Tipo de consulta',
    /** [PROPIO] Etiqueta del campo de asunto. */
    etiquetaAsunto: 'Asunto',
    /** [PROPIO] Etiqueta del area de texto de la descripcion. */
    etiquetaDescripcion: 'Descripción',
    /** [PROPIO] Etiqueta del bloque de adjuntos. */
    etiquetaAdjuntos: 'Archivos adjuntos',

    /** [PROPIO] Placeholder del campo asunto. */
    placeholderAsunto: 'Contanos brevemente de qué se trata',
    /** [PROPIO] Placeholder del area de descripcion. */
    placeholderDescripcion: 'Detallá tu consulta, sugerencia o reporte',

    /** [PROPIO] Accion que abre el selector de archivos. */
    botonAdjuntar: 'Adjuntar archivo',
    /** [PROPIO] Accion que quita un adjunto ya elegido. */
    botonQuitar: 'Quitar',
    /** [PROPIO] Accion principal que abre la confirmacion de envio. */
    botonEnviar: 'Enviar consulta',

    /**
     * LITERAL - US-AYU-03, "Tipo de consulta (Consulta general / Reporte de
     * problema / Sugerencia de mejora / Denuncia) - obligatorio". La barra
     * separa los cuatro valores y no es texto a mostrar; se transcriben
     * cuatro entradas.
     */
    tTipoConsulta: {
      /** [PROPIO] Etiqueta del desplegable cuando no hay valor elegido. */
      placeholder: 'Elegí un tipo de consulta',
      consultaGeneral: 'Consulta general',
      reporteProblema: 'Reporte de problema',
      sugerenciaMejora: 'Sugerencia de mejora',
      denuncia: 'Denuncia',
    },

    /** LITERAL - US-AYU-03, longitud maxima del asunto. */
    asuntoMaximo: 'El asunto no puede tener más de 100 caracteres.',
    /** LITERAL - US-AYU-03, longitud maxima de la descripcion. */
    descripcionMaxima: 'La descripción no puede tener más de 1500 caracteres.',

    /**
     * LITERAL - US-AYU-03, "El archivo debe ser JPG, PNG o PDF de hasta 5
     * MB." La cadena vive tambien en `schemas/soporte.schema.ts` para que
     * el `zod` del server la muestre sin un import circular; los dos
     * lugares tienen que coincidir palabra por palabra.
     */
    adjuntoInvalido: 'El archivo debe ser JPG, PNG o PDF de hasta 5 MB.',

    /** LITERAL - US-AYU-03, "Podés adjuntar hasta 3 archivos por consulta." */
    maximoAdjuntos: 'Podés adjuntar hasta 3 archivos por consulta.',

    /**
     * LITERAL - US-AYU-03, dialogo de confirmacion previo al envio. La
     * oracion completa va como titulo (mismo criterio de DialogoSevero en
     * otros modulos) y se omite el `mensaje` para que el modal no duplique
     * la pregunta.
     */
    confirmarEnvioTitulo:
      '¿Confirmás el envío de tu consulta? Recibirás una respuesta en tu correo electrónico.',
    /** LITERAL - US-AYU-03, opcion que confirma el envio. */
    confirmarEnvioBotonSi: 'Sí, enviar',
    /** LITERAL - US-AYU-03, opcion que vuelve al formulario. */
    confirmarEnvioBotonNo: 'No, volver',

    /**
     * LITERAL - US-AYU-03, exito del envio. El placeholder [correo] del
     * criterio se interpola con la direccion del usuario que envia.
     */
    envioExitoso: (correo: string) =>
      `Consulta enviada con éxito. Te responderemos a ${correo} en un plazo aproximado de 48 horas hábiles.`,

    /**
     * LITERAL - US-AYU-03, mensaje que se muestra cuando falla la conexion
     * con el servidor de correo. El mismo dialogo lleva las dos opciones.
     */
    errorEnvio:
      'No pudimos enviar tu consulta. Revisa tu conexión a internet y vuelve a intentarlo.',
    /** LITERAL - US-AYU-03, reintenta el envio sin cambios. */
    errorEnvioBotonReintentar: 'Reintentar',
    /** LITERAL - US-AYU-03, guarda el formulario como borrador local. */
    errorEnvioBotonBorrador: 'Guardar borrador',

    /**
     * LITERAL - US-AYU-03, "Conserve los datos del formulario de forma
     * local. Al volver a ingresar, muestre el formulario precargado y el
     * mensaje: 'Tenés un borrador guardado. ¿Querés continuar editándolo o
     * empezar uno nuevo?' con los botones 'Continuar' y 'Empezar nuevo'."
     */
    borradorTitulo:
      'Tenés un borrador guardado. ¿Querés continuar editándolo o empezar uno nuevo?',
    /** LITERAL - US-AYU-03, opcion que precarga el borrador. */
    borradorBotonContinuar: 'Continuar',
    /** LITERAL - US-AYU-03, opcion que descarta el borrador. */
    borradorBotonNuevo: 'Empezar nuevo',
  },
} as const;

/**
 * Modulo de Exploracion y busqueda (US-EXP-01 a US-EXP-07).
 *
 * Los estados vacios de las cinco pantallas, los tres dialogos de confirmacion
 * del carrito, las dos confirmaciones de favorito y los avisos de
 * disponibilidad transcriben caracter por caracter la tabla de criterios de
 * aceptacion de la seccion 2.2.1.3.3 del documento de proyecto.
 *
 * Un texto que este bloque NO repite: "No se encontraron platos con esos
 * criterios..." es propio de este modulo y distinto de
 * `MENSAJES_PUBLICACION.sinResultados` (que habla de publicaciones y de
 * filtros del cocinero), asi que van separados a proposito.
 */
export const MENSAJES_EXPLORACION = {
  // --- Feed (US-EXP-01) ------------------------------------------------------
  /** LITERAL - US-EXP-01, no hay publicaciones activas en la zona del cliente. */
  feedVacio: 'No hay publicaciones disponibles cerca de vos por ahora.',

  // --- Mapa (US-EXP-02) -----------------------------------------------------
  /**
   * LITERAL - US-EXP-02, el cliente no otorgo permisos de ubicacion. Sin punto
   * final: asi esta escrito en el criterio de aceptacion.
   */
  sinPermisoUbicacion: 'Activá la ubicación para ver cocineros cerca tuyo',

  /** LITERAL - US-EXP-02, no hay cocineros en la zona visible del mapa. */
  mapaSinCocineros: 'No hay cocineros disponibles en esta área.',

  /** LITERAL - US-EXP-02, boton de la tarjeta emergente del marcador. */
  verPerfil: 'Ver perfil',

  // --- Filtros y busqueda (US-EXP-03) ---------------------------------------
  /** LITERAL - US-EXP-03, busqueda o filtros combinados sin coincidencias. */
  sinResultados:
    'No se encontraron platos con esos criterios. Probá ajustando los filtros.',

  /** LITERAL - US-EXP-03, boton que borra los filtros y el texto del buscador. */
  limpiarFiltros: 'Limpiar filtros',

  // --- Perfil publico del cocinero (US-EXP-04) ------------------------------
  /** LITERAL - US-EXP-04, el cocinero no tiene publicaciones activas. */
  cocineroSinPlatos: 'Este cocinero no tiene platos disponibles por ahora.',

  /**
   * LITERAL - US-EXP-04, el cocinero todavia no tiene resenas. Reemplaza al
   * promedio de estrellas; no se muestra junto a un 0.
   */
  cocineroSinResenas: 'Sin calificaciones aún',

  /** LITERAL - US-EXP-04, boton que abre la mensajeria con el cocinero. */
  enviarMensaje: 'Enviar mensaje',

  // --- Detalle de la publicacion (US-EXP-05) --------------------------------
  /** LITERAL - US-EXP-05, boton principal del detalle. */
  agregarAlCarrito: 'Agregar al carrito',

  /**
   * LITERAL - US-EXP-05, indicacion que acompana al boton deshabilitado cuando
   * el plato esta "No disponible".
   */
  sinUnidadesDisponibles: 'Sin unidades disponibles',

  /** LITERAL - US-EXP-05, el carrito vigente es de otro cocinero. */
  carritoDeOtroCocinero:
    'Tu carrito tiene platos de otro cocinero. ¿Querés vaciarlo y comenzar uno nuevo?',

  /** LITERAL - US-EXP-05, boton que vacia el carrito anterior y agrega el plato. */
  carritoDeOtroCocineroConfirmar: 'Sí, vaciar',

  /** LITERAL - US-EXP-05, boton que no realiza ningun cambio. */
  carritoDeOtroCocineroCancelar: 'No, cancelar',

  /**
   * LITERAL - US-EXP-05, el plato ya estaba en el carrito y se incremento en 1.
   * El criterio escribe el placeholder como "[nro Cant actual en el carrito]";
   * esta funcion interpola el valor real en ese lugar.
   */
  cantidadActualizada: (cantidad: number) =>
    `Cantidad actualizada en tu carrito. Cantidad actual ${String(cantidad)}.`,

  // --- Favoritos (US-EXP-06) ------------------------------------------------
  /** LITERAL - US-EXP-06, confirmacion breve al guardar un favorito. */
  favoritoAgregado: 'Guardado en favoritos',

  /** LITERAL - US-EXP-06, confirmacion al quitar un favorito. */
  favoritoQuitado: 'Eliminado de favoritos',

  /** LITERAL - US-EXP-06, titulo de la seccion y de sus dos pestanas. */
  misFavoritos: 'Mis favoritos',
  pestanaCocineros: 'Cocineros',
  pestanaPublicaciones: 'Publicaciones',

  /**
   * LITERAL - US-EXP-06, pestana sin favoritos guardados.
   *
   * El criterio lo escribe como "Todavía no guardaste ningún cocinero/plato
   * como favorito.": la barra es la notacion de las dos pestanas, no texto a
   * mostrar, asi que se transcribe una variante por pestana. Es la unica
   * interpretacion de este bloque y queda anotada como tal.
   */
  sinCocinerosFavoritos: 'Todavía no guardaste ningún cocinero como favorito.',
  sinPublicacionesFavoritas: 'Todavía no guardaste ningún plato como favorito.',

  /** LITERAL - US-EXP-06, filtro "Mis favoritos" sin cocineros guardados. */
  sinFavoritosParaFiltrar:
    'Guardá cocineros como favoritos para filtrar el feed.',

  // --- Carrito (US-EXP-07) --------------------------------------------------
  /** LITERAL - US-EXP-07, campo de texto opcional de la pantalla del carrito. */
  notasParaElCocinero: 'Notas para el cocinero',

  /** LITERAL - US-EXP-07, confirmacion al quitar un item (boton "x" o "-" en 1). */
  quitarItemMensaje: '¿Querés quitar este plato del carrito?',
  quitarItemConfirmar: 'Sí, quitar',
  quitarItemCancelar: 'Cancelar',

  /** LITERAL - US-EXP-07, estado vacio del carrito (PAN-PED-01.1). */
  carritoVacio: 'Tu carrito está vacío. Explorá los platos disponibles.',

  /** LITERAL - US-EXP-07, boton y confirmacion de vaciado total. */
  vaciarCarrito: 'Vaciar carrito',
  vaciarCarritoMensaje: '¿Querés vaciar todo el carrito?',
  vaciarCarritoConfirmar: 'Sí, vaciar',
  vaciarCarritoCancelar: 'Cancelar',

  /** LITERAL - US-EXP-07, boton que lleva a la confirmacion del pedido. */
  confirmarPedido: 'Confirmar pedido',

  /**
   * LITERAL - US-EXP-07, un plato del carrito paso a "No disponible" y se
   * quito solo. El criterio lo redacta en singular; la interfaz lo repite por
   * cada plato afectado en vez de pluralizarlo por su cuenta.
   */
  itemQuitadoPorNoDisponible:
    'Este plato ya no está disponible y fue quitado de tu carrito.',
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

  /** PROPIO - US-CFG-03 / US-AYU-04, validación del horario de atención. */
  horarioHoraInvalida: 'Ingresá una hora válida.',
  /** PROPIO - US-CFG-03 / US-AYU-04, al menos un día de atención. */
  horarioDiaObligatorio:
    'Seleccioná al menos un día en el que la plataforma tenga atención.',
  /** PROPIO - US-CFG-03 / US-AYU-04, cierre posterior a la apertura. */
  horarioFinPosterior: 'La hora de cierre debe ser posterior a la de apertura.',

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

/**
 * Modulo de Pedidos (US-PED-01 a US-PED-10, RF022 a RF032).
 *
 * Casi todo este bloque es LITERAL: el ciclo de vida del pedido es el proceso
 * que mas textos fijos tiene en la documentacion, porque el cliente y el
 * cocinero ven leyendas distintas del MISMO estado interno. Esa traduccion
 * -CREADO se muestra "Recibido" al cliente y "Nuevo" al cocinero- es parte del
 * requerimiento, no una decision de interfaz, y por eso vive aca y no en las
 * pantallas.
 *
 * DONDE LA MAQUETACION Y EL DOCUMENTO DIFIEREN, GANA EL DOCUMENTO (decision del
 * equipo del 14/08/2026). Los dos casos de este modulo quedan anotados en el
 * literal correspondiente.
 */
export const MENSAJES_PEDIDO = {
  // --- Leyendas del ciclo de vida -------------------------------------------
  /**
   * LITERAL - US-PED-02: "una linea de tiempo con cuatro leyendas visuales
   * secuenciales: Recibido (estado interno: Creado), Preparando (estado
   * interno: Aceptado), Listo (estado interno: Listo) y Entregado (estado
   * interno: Completado)".
   *
   * Son las leyendas QUE VE EL CLIENTE. El cocinero nombra los mismos estados
   * con las etiquetas de sus pestanas (US-PED-03), que estan mas abajo.
   */
  leyendaRecibido: 'Recibido',
  leyendaPreparando: 'Preparando',
  leyendaListo: 'Listo',
  leyendaEntregado: 'Entregado',

  // --- Seguimiento del pedido (US-PED-02, PAN-PED-03) -----------------------
  /**
   * LITERAL - US-PED-02, encabezado de la pantalla de seguimiento al confirmar.
   *
   * La maquetacion escribe "!Pedido enviado!" en PAN-PED-03.0 y "!Pedido
   * confirmado!" en PAN-PED-03; el criterio de aceptacion fija el segundo para
   * los dos casos, asi que se usa uno solo.
   */
  pedidoConfirmado: '¡Pedido confirmado!',

  /** PROPIO - bajada del banner mientras el cocinero no responde (PAN-PED-03.0). */
  esperandoConfirmacion: 'Esperando confirmación del cocinero…',

  /** LITERAL - US-PED-02, enlace al detalle completo desde el seguimiento. */
  verDetalleDelPedido: 'Ver detalle del pedido',

  /**
   * LITERAL - US-PED-02, rotulo del tiempo estimado, y la forma del rango del
   * ejemplo del criterio ("Estimado 9:45 - 9:55 hs").
   */
  tiempoEstimado: 'Tiempo estimado',
  rangoEstimado: (desde: string, hasta: string) =>
    `Estimado ${desde} – ${hasta} hs`,

  // --- Origen del rechazo ---------------------------------------------------
  /** LITERAL - US-PED-02 y US-PED-06, el cocinero rechazo el pedido. */
  rechazadoPorElCocinero: 'Rechazado por el cocinero',

  /** LITERAL - US-PED-02 y US-PED-06, el propio cliente cancelo. */
  canceladoPorVos: 'Cancelado por vos',

  /**
   * PROPIO - la misma cancelacion, vista por el COCINERO.
   *
   * US-PED-06 y US-PED-07 fijan "Cancelado por vos" para la pantalla del
   * CLIENTE y no dicen nada de como lo ve la otra parte; el detalle del pedido
   * es una sola pantalla para los dos roles, asi que sin este texto el cocinero
   * leia que habia cancelado el mismo.
   *
   * NO se reusa `MENSAJES_DASHBOARD.estadoCanceladosCliente`: es plural y
   * rotula una serie del grafico de US-DASH-04, no un pedido.
   */
  canceladoPorElCliente: 'Cancelado por el cliente',

  /**
   * LITERAL - US-PED-06, etiqueta de la tarjeta en el historial cuando expiro.
   * El criterio la escribe con guion medio: "Expirado - sin respuesta del
   * cocinero".
   */
  expiradoSinRespuesta: 'Expirado - sin respuesta del cocinero',

  /**
   * LITERAL - US-PED-07, indicador de estado en el DETALLE de un pedido
   * expirado. Es un texto distinto del anterior, no una variante de redaccion:
   * la tarjeta del historial y el detalle lo dicen con otras palabras.
   */
  expiradoSinRespuestaDetalle: 'Expirado - el cocinero no respondió a tiempo',

  /** LITERAL - US-PED-07, encabezados del detalle segun como termino el pedido. */
  encabezadoPedidoRechazado: 'Pedido rechazado',
  encabezadoPedidoCancelado: 'Pedido cancelado',
  encabezadoPedidoExpirado: 'Pedido expirado',

  // --- Historial del cliente (US-PED-06, PAN-PED-05) ------------------------
  /**
   * LITERAL - US-PED-06: "tres pestanas horizontales: Activos ("En curso"),
   * Completados y Rechazados". El criterio da los dos nombres de la primera; la
   * maquetacion rotula "En curso", que es el que se muestra.
   */
  pestanaEnCurso: 'En curso',
  pestanaCompletados: 'Completados',
  pestanaRechazados: 'Rechazados',

  /** LITERAL - US-PED-06, pestana "Activos" sin pedidos. */
  sinPedidosEnCurso: 'No tenés pedidos en curso ahora mismo',

  /** LITERAL - US-PED-06, pestana "Rechazados" sin pedidos. */
  sinPedidosRechazados: '¡Todo bien! No tenés pedidos rechazados',

  /**
   * PROPIO - US-PED-06 pide un estado vacio "acorde a la pestana" y solo da
   * ejemplos para "Activos" y "Rechazados".
   */
  sinPedidosCompletados: 'Todavía no completaste ningún pedido',

  /** LITERAL - US-PED-06 y US-PED-07, accion sobre un pedido completado. */
  dejarResena: 'Dejar reseña',

  /** LITERAL - US-PED-07, el cliente ya reseno lo que pidio. */
  yaCalificasteEstePedido: 'Ya calificaste este pedido',

  // --- Cancelacion por el cliente (US-PED-09, PAN-PED-03.0.1) ---------------
  /** LITERAL - US-PED-09, boton visible solo mientras el pedido esta en Creado. */
  cancelarPedido: 'Cancelar pedido',

  /** LITERAL - US-PED-09, titulo del dialogo de confirmacion. */
  cancelarPedidoTitulo: '¿Cancelar pedido?',

  /** LITERAL - US-PED-09, campo de texto opcional del dialogo. */
  cancelarPedidoPlaceholder: 'Contale al cocinero por qué cancelás (opcional)',

  /** LITERAL - US-PED-09, botones del dialogo. */
  cancelarPedidoConfirmar: 'Sí, cancelar',
  cancelarPedidoVolver: 'Volver',

  /**
   * LITERAL - US-PED-09: paso el tiempo maximo de cancelacion (RF057) y el
   * cliente intenta cancelar igual "via API". Con punto final, como el criterio.
   */
  cancelacionExpirada: 'El tiempo para cancelar este pedido ha expirado.',

  /** PROPIO - el pedido ya no esta en Creado cuando llega la cancelacion. */
  cancelacionFueraDeEstado:
    'Este pedido ya no se puede cancelar porque el cocinero lo respondió.',

  // --- Bandeja del cocinero (US-PED-03, US-PED-05, US-PED-08) ---------------
  /**
   * LITERAL - US-PED-03: "cinco pestanas: Nuevos (pedidos en estado Creado),
   * Preparando (Aceptado), Listos (Listo), Completados y Rechazados".
   */
  pestanaNuevos: 'Nuevos',
  pestanaPreparando: 'Preparando',
  pestanaListos: 'Listos',

  /** LITERAL - US-PED-03, boton de cada tarjeta de la bandeja. */
  verDetalle: 'Ver detalle',

  /** LITERAL - US-PED-03 y US-PED-04, acciones del detalle de un pedido nuevo. */
  aceptar: 'Aceptar',
  rechazar: 'Rechazar',

  /** LITERAL - US-PED-03, rotulo del selector de tiempo (PAN-PED-04.4). */
  tiempoEstimadoDePreparacion: 'Tiempo estimado de preparación',

  /**
   * LITERAL - US-PED-03, se presiono "Aceptar" sin elegir tiempo.
   *
   * Sin punto final y con voseo: asi lo escribe el criterio de aceptacion.
   * RF025 lo transcribe como "Selecciona el tiempo estimado de preparacion.";
   * ante la diferencia manda la US, que es lo que verifican las pruebas
   * funcionales.
   */
  seleccionaTiempoPreparacion: 'Seleccioná el tiempo estimado de preparación',

  /** PROPIO - referencia bajo el selector de tiempo (PAN-PED-04.4). */
  listoAproximadamenteALas: (hora: string) =>
    `Listo aproximadamente a las ${hora} hs`,

  /** LITERAL - US-PED-05, boton que avanza un pedido de Preparando a Listos. */
  marcarListo: 'Listo',

  /** LITERAL - US-PED-05, boton que completa un pedido de la pestana Listos. */
  marcarEntregado: 'Entregado',

  /** LITERAL - US-PED-05, dialogo de confirmacion de la entrega. */
  confirmarEntregaTitulo: '¿Confirmar entrega?',
  confirmarEntregaConfirmar: 'Confirmar',
  confirmarEntregaCancelar: 'Cancelar',

  /** LITERAL - US-PED-05, pestana "Preparando" sin pedidos. */
  sinPedidosPreparandose: 'No tenés pedidos preparándose ahora',

  /**
   * PROPIO - US-PED-05 pide un estado vacio "con un mensaje acorde" y solo da
   * el ejemplo de "Preparando".
   */
  sinPedidosNuevos: 'No tenés pedidos nuevos por ahora',
  sinPedidosListos: 'No tenés pedidos listos para entregar',

  /**
   * LITERAL - US-PED-08: "Aun no tienes pedidos Completados/Rechazados". La
   * barra separa las dos pestanas, no es texto a mostrar, asi que se transcribe
   * una variante por pestana. El tuteo -unico en toda la aplicacion, que vosea-
   * es el del criterio y se respeta.
   */
  cocineroSinPedidosCompletados: 'Aún no tienes pedidos Completados',
  cocineroSinPedidosRechazados: 'Aún no tienes pedidos Rechazados',

  /** LITERAL - US-PED-08, accion sobre un pedido completado del cocinero. */
  calificarCliente: 'Calificar cliente',

  // --- Rechazo por el cocinero (US-PED-04, PAN-PED-04.5) --------------------
  /** LITERAL - US-PED-04, titulo de la pantalla de rechazo. */
  rechazarPedidoTitulo: 'Rechazar pedido',

  /** LITERAL - US-PED-04, campo de texto libre opcional. */
  motivoRechazoPlaceholder: 'Contale al cliente el motivo del rechazo...',

  /** LITERAL - US-PED-04, boton que confirma el rechazo. */
  confirmarRechazo: 'Confirmar rechazo',

  /**
   * LITERAL - US-PED-04: el boton "permanece deshabilitado hasta que el
   * cocinero seleccione al menos un motivo rapido O ingrese al menos 5 palabras
   * en el campo de texto libre".
   */
  motivoRechazoRequerido:
    'Elegí un motivo o escribí al menos 5 palabras para el cliente.',

  /** PROPIO - ayuda bajo el campo de texto (PAN-PED-04.5: "Minimo 5 palabras"). */
  motivoRechazoMinimo: 'Mínimo 5 palabras',

  /** PROPIO - advertencia de la pantalla de rechazo (PAN-PED-04.5). */
  rechazoIrreversible:
    'Una vez rechazado, el pedido no puede recuperarse. El cliente recibirá el motivo ingresado.',

  // --- Errores de la maquina de estados -------------------------------------
  /**
   * LITERAL - US-PED-04, tercer criterio: el rechazo "solo esta disponible para
   * pedidos en estado Creado".
   */
  rechazoFueraDeEstado:
    'Solo se pueden rechazar los pedidos que todavía no aceptaste.',

  /** PROPIO - transicion no declarada en TRANSICIONES_PEDIDO. */
  transicionInvalida: 'El pedido ya no se encuentra en ese estado.',

  /** PROPIO - el carrito quedo vacio entre que se dibujo la pantalla y el toque. */
  carritoVacioAlConfirmar:
    'Tu carrito está vacío. Agregá platos antes de confirmar el pedido.',

  /** PROPIO - el cocinero se dio de baja o fue suspendido antes de confirmar. */
  cocineroNoDisponible:
    'Este cocinero ya no está recibiendo pedidos. Probá con otro.',

  // --- Titulos de pantalla --------------------------------------------------
  /** PROPIO - titulos de las pantallas del modulo. */
  misPedidos: 'Mis pedidos',
  seguimiento: 'Seguimiento',
  nuevoPedido: 'Nuevo pedido',
  lineaDeTiempo: 'Línea de tiempo',
  notaDelCliente: 'Nota del cliente',
  totalDelPedido: 'Total del pedido',
  cantidad: (unidades: number) => `Cantidad: ${String(unidades)}`,
} as const;

/**
 * Modulo de Resenas y Calificaciones (US-RES-01 a US-RES-03, RF080 a RF082).
 *
 * ALCANCE DE ESTE ARCHIVO: las tres historias del nucleo. Las tres sociales
 * -US-RES-04 reacciones, US-RES-05 respuestas y US-RES-06 reportes- van en un
 * segundo PR y sus literales se agregan aca cuando se implementen. No se
 * declaran por adelantado: una constante que nadie usa es una promesa que el
 * compilador no puede verificar.
 *
 * LA RESENA ES POR PLATO, NO POR PEDIDO (decision del equipo, 2026-08-18). El
 * objeto resenado es la publicacion; el pedido solo habilita el derecho a
 * opinar. Si alguna otra fuente dice "una resena por pedido", esta
 * desactualizada.
 *
 * DOS PLAZOS DISTINTOS QUE NO HAY QUE CONFUNDIR:
 *
 *   14 dias   plazo para CREAR la resena, contado desde que se completa el
 *             pedido. Sale de `resena_limite_dias_para_resenar`, editable
 *             desde PAN-ADM-04.
 *   48 horas  plazo para EDITAR una resena ya publicada, contado desde su
 *             publicacion. Cada nuevo pedido completado que incluya el mismo
 *             plato REABRE la ventana, contando desde ese completado.
 */
export const MENSAJES_RESENA = {
  // --- Dejar resena (US-RES-01) ---------------------------------------------
  /**
   * LITERAL - US-RES-01: los tres estados del boton segun exista resena y este
   * abierta la ventana de edicion. RF031 los pide POR ITEM del pedido, no uno
   * solo para todo el pedido.
   *
   * "Dejar resena" no se declara aca: ya vive en `MENSAJES_PEDIDO.dejarResena`
   * porque el modulo de Pedidos lo necesito antes de que existiera este.
   */
  editarMiResena: 'Editar mi reseña',
  verMiResena: 'Ver mi reseña',

  /** LITERAL - US-RES-01, boton que confirma el alta desde PAN-RES-01. */
  publicarResena: 'Publicar reseña',

  /**
   * LITERAL - US-RES-01: "Muestre el mensaje: 'Tenes que asignar una
   * calificacion de al menos 1 estrella' debajo del componente de estrellas".
   * Sin punto final: asi esta en el criterio de aceptacion.
   *
   * El mismo literal lo exige US-RES-02 para la calificacion del cliente, asi
   * que se declara una sola vez y lo usan las dos pantallas.
   */
  calificacionRequerida:
    'Tenés que asignar una calificación de al menos 1 estrella',

  /** LITERAL - US-RES-01, filtro automatico de moderacion sobre el comentario. */
  comentarioModerado:
    'Tu reseña contiene términos que no cumplen con nuestras normas de comunidad. Por favor, modificála antes de publicar.',

  /** LITERAL - US-RES-01, botones de la vista previa previa a publicar. */
  vistaPreviaEditar: 'Editar',
  vistaPreviaPublicar: 'Publicar',

  /** LITERAL - US-RES-01, confirmacion del alta. */
  resenaPublicada: '¡Reseña publicada con éxito!',

  /**
   * LITERAL - US-RES-01, ultimo criterio: el plato pertenece a un pedido que no
   * llego a Completado.
   */
  pedidoNoCompletado: 'No se puede reseñar un plato de un pedido cancelado.',

  // --- Calificar al cliente (US-RES-02) -------------------------------------
  /** LITERAL - US-RES-02: los dos estados del boton segun exista calificacion. */
  calificarCliente: 'Calificar cliente',
  editarCalificacion: 'Editar calificación',

  /** LITERAL - US-RES-02, boton que confirma el envio desde PAN-RES-02. */
  enviarCalificacion: 'Enviar calificación',

  /** LITERAL - US-RES-02, confirmacion del envio. */
  calificacionEnviada:
    '¡Calificación enviada con éxito! La información es visible solo para otros cocineros que reciban pedidos de este cliente.',

  /**
   * LITERAL - US-RES-02: "Si el cliente registra menos de 3 pedidos completados
   * en la plataforma, muestre el texto 'Cliente nuevo' en lugar del promedio".
   *
   * OJO: el umbral de este texto son PEDIDOS COMPLETADOS del cliente, no
   * calificaciones recibidas. Es un criterio distinto del de
   * `resena_minimo_para_promedio`, que cuenta RESENAS y aplica al promedio
   * publico del cocinero. Coinciden en el numero 3 y en nada mas.
   */
  clienteNuevo: 'Cliente nuevo',

  // --- Ver resenas en el perfil publico (US-RES-03) -------------------------
  /**
   * LITERAL - US-RES-03, estado vacio de la seccion de resenas.
   *
   * El subtitulo va sin tilde en "Se": asi esta transcrito el criterio de
   * aceptacion. Es la misma decision que ya se tomo con "Este correo ya esta
   * registrado" en MENSAJES_AUTH — gana el documento por sobre la ortografia,
   * porque las pruebas funcionales de la Etapa 6 comparan palabra por palabra.
   */
  cocineroSinResenasTitulo: 'Este cocinero aún no recibió reseñas.',
  cocineroSinResenasSubtitulo: 'Se el primero en compartir tu experiencia.',

  /**
   * LITERAL - US-RES-03, boton del estado vacio. Es distinto de
   * `MENSAJES_PEDIDO.dejarResena` ("Dejar reseña"): el criterio escribe
   * "Dejar una reseña" con articulo. No unificarlos.
   */
  dejarUnaResena: 'Dejar una reseña',

  /**
   * LITERAL - US-RES-03: la publicacion resenada fue dada de baja por el
   * cocinero. La resena sobrevive y sigue promediando; lo unico que cambia es
   * el nombre del plato y que el enlace deja de funcionar.
   */
  platoNoDisponible: '[Plato no disponible]',

  /**
   * LITERAL - US-RES-03, opciones del selector de orden.
   *
   * "Mas utiles" NO esta: ordena por cantidad de reacciones y las reacciones
   * son US-RES-04, que no entra en este PR. Se agrega junto con esa historia,
   * no antes: una opcion de orden que siempre devuelve lo mismo es peor que no
   * ofrecerla.
   */
  ordenMasRecientes: 'Más recientes',
  ordenMejorCalificacion: 'Mejor calificación',
  ordenPeorCalificacion: 'Peor calificación',

  /**
   * LITERAL - US-RES-03, filtros del listado.
   *
   * Falta "Solo resenas con respuesta del cocinero" por el mismo motivo que
   * "Mas utiles": depende de US-RES-05.
   */
  filtroSoloConFoto: 'Solo reseñas con foto',

  // --- Rechazos de la API ---------------------------------------------------
  /**
   * LOS CINCO DE ABAJO SON PROPIOS, no literales.
   *
   * Las historias describen estos casos como "no muestre el boton": resuelven
   * la interfaz y no dicen que responde el servidor. Pero la regla del modulo
   * de seguridad es que toda validacion del formulario existe tambien en la
   * API, y una API que rechaza tiene que explicar por que. Se redactan aca, en
   * un bloque aparte y anotados como PROPIO, para que se distingan de lo que si
   * esta comprometido con el documento y el equipo los pueda corregir sin miedo
   * a romper una prueba funcional.
   */

  /** PROPIO - no hay ningun pedido completado del cliente con ese plato. */
  sinDerechoAResenar:
    'Solo podés reseñar un plato que hayas recibido en un pedido completado.',

  /** PROPIO - pasaron mas dias de los que fija `resena_limite_dias_para_resenar`. */
  plazoParaResenarVencido:
    'Ya pasó el plazo para reseñar este plato. Si volvés a pedirlo vas a poder hacerlo.',

  /**
   * PROPIO - ya existe resena de este cliente sobre este plato. No es un error
   * del usuario: la accion correcta es editar, y por eso el mensaje lo dice.
   */
  resenaYaExiste: 'Ya reseñaste este plato. Podés editar tu reseña.',

  /** PROPIO - la ventana de 48 horas se cerro. */
  edicionFueraDeVentana:
    'Ya pasó el plazo para editar esta reseña. Si volvés a pedir el plato vas a poder actualizarla.',

  /** PROPIO - el cocinero nunca tuvo un pedido aceptado con ese cliente. */
  sinDerechoACalificar:
    'Solo podés calificar a un cliente con el que hayas tenido un pedido aceptado.',

  /**
   * PROPIO - la foto adjunta no es una imagen admitida o supera los 5 MB.
   *
   * RF080 fija el tope ("foto del plato en formato de imagen de hasta 5 MB")
   * pero no redacta el rechazo. Se calca la forma de `MENSAJES_PUBLICACION` y
   * `MENSAJES_USUARIO`, que ya resuelven lo mismo para el plato y el perfil.
   */
  fotoInvalida: 'La foto debe ser una imagen JPG, PNG o WEBP de hasta 5 MB.',
} as const;

/**
 * Modulo de Dashboard del cocinero (US-DASH-01 a US-DASH-05, RF042 a RF046).
 *
 * Una sola pantalla -PAN-DASH-01, "Mi actividad"- con cuatro secciones y un
 * filtro de periodo que las atraviesa a las cuatro.
 *
 * EL DOCUMENTO SE CONTRADICE A SI MISMO EN LOS ESTADOS VACIOS. Los requisitos
 * los escriben con tuteo ("No tienes platos pedidos...") y los criterios de
 * aceptacion con voseo ("No tenes platos pedidos..."); RF045 llega a mezclar
 * las dos formas en la misma frase. GANA LA HISTORIA DE USUARIO (decision del
 * equipo del 20/08/2026): las pruebas funcionales de la Etapa 6 verifican los
 * criterios de aceptacion palabra por palabra, no los requisitos.
 */
export const MENSAJES_DASHBOARD = {
  // --- Resumen general (US-DASH-01) -----------------------------------------
  /** LITERAL - US-DASH-01: "el cocinero accede a la seccion 'Mi actividad'". */
  miActividad: 'Mi actividad',

  /**
   * LITERAL - US-DASH-01: "tres tarjetas de resumen en la parte superior:
   * 'Ventas acumuladas' (monto total en pesos de los pedidos Completados en el
   * periodo seleccionado), 'Pedidos totales' (cantidad total de pedidos en el
   * periodo) y 'Valoracion promedio'".
   */
  ventasAcumuladas: 'Ventas acumuladas',
  pedidosTotales: 'Pedidos totales',
  valoracionPromedio: 'Valoración promedio',

  /**
   * LITERAL - US-DASH-01: "las tres tarjetas de resumen con valor '—' o '$0'
   * segun corresponda". Es el guion largo, no un guion medio.
   *
   * El "$0" del criterio NO se declara aca: un importe en cero es un importe, y
   * lo formatea `formatearPrecio` como cualquier otro. Declararlo como literal
   * dejaria dos formas distintas de escribir el mismo cero segun la pantalla.
   */
  sinValor: '—',

  /** LITERAL - US-DASH-01, el mensaje informativo que va debajo de las tarjetas. */
  sinActividad: 'No tenés actividad registrada en el período seleccionado.',

  /**
   * LITERAL - US-DASH-01: "la leyenda 'Sin calificaciones aun' en lugar del
   * promedio de estrellas". Sin punto final, tal como lo escribe el criterio.
   */
  sinCalificaciones: 'Sin calificaciones aún',

  // --- Platos mas pedidos (US-DASH-02) --------------------------------------
  /** LITERAL - US-DASH-02: "la seccion 'Platos mas pedidos' dentro del dashboard". */
  platosMasPedidos: 'Platos más pedidos',

  /** LITERAL - US-DASH-02: "un boton 'Ver todos' que expanda el listado completo". */
  verTodos: 'Ver todos',

  /** LITERAL - US-DASH-02: "la indicacion '(eliminado)' junto al nombre". */
  sufijoEliminado: '(eliminado)',

  /** LITERAL - US-DASH-02, estado vacio de la seccion. */
  sinPlatosPedidos: 'No tenés platos pedidos en el período seleccionado.',

  // --- Clientes recurrentes (US-DASH-03) ------------------------------------
  /** LITERAL - US-DASH-03: "la seccion 'Clientes recurrentes' dentro del dashboard". */
  clientesRecurrentes: 'Clientes recurrentes',

  /**
   * LITERAL - US-DASH-03: "la indicacion 'Usuario eliminado' en lugar de su
   * nombre y sin foto de perfil". El cliente sigue en el listado: sacarlo
   * cambiaria las metricas historicas de un periodo ya cerrado.
   */
  usuarioEliminado: 'Usuario eliminado',

  /** LITERAL - US-DASH-03, estado vacio de la seccion. */
  sinClientesRecurrentes:
    'Todavía no tenés clientes recurrentes en el período seleccionado. ¡Seguí cocinando!',

  // --- Distribucion por estado (US-DASH-04) ---------------------------------
  /** LITERAL - US-DASH-04: "la seccion 'Pedidos por estado' dentro del dashboard". */
  pedidosPorEstado: 'Pedidos por estado',

  /**
   * LITERAL - US-DASH-04: "pedidos agrupados por estado: Completados,
   * Rechazados por el cocinero, Cancelados por el cliente y Expirados".
   *
   * Son CUATRO rotulos para DOS estados internos: COMPLETADO, y RECHAZADO
   * abierto por `origen_rechazo` (COCINERO / CLIENTE / SISTEMA). Los pedidos
   * todavia abiertos -CREADO, ACEPTADO y LISTO- no tienen rotulo porque el
   * criterio no los enumera.
   *
   * En plural y no reutilizando `MENSAJES_PEDIDO.rechazadoPorElCocinero`: aquel
   * rotula UN pedido en el detalle, este cuenta a un grupo. Son dos historias
   * distintas con dos textos distintos y no se unifican.
   */
  estadoCompletados: 'Completados',
  estadoRechazadosCocinero: 'Rechazados por el cocinero',
  estadoCanceladosCliente: 'Cancelados por el cliente',
  estadoExpirados: 'Expirados',

  /** LITERAL - US-DASH-04, estado vacio de la seccion: "No se muestra ningun grafico". */
  sinPedidosRegistrados:
    'No tenés pedidos registrados en el período seleccionado.',

  // --- Filtro de periodo (US-DASH-05) ---------------------------------------
  /**
   * LITERAL - US-DASH-05: "las siguientes opciones predefinidas: 'Esta semana',
   * 'Este mes', 'Ultimos 3 meses', 'Este ano' y 'Personalizado'".
   */
  periodoSemana: 'Esta semana',
  periodoMes: 'Este mes',
  periodoTrimestre: 'Últimos 3 meses',
  periodoAnio: 'Este año',
  periodoPersonalizado: 'Personalizado',

  /** LITERAL - US-DASH-05: "un selector de rango de fechas con campos 'Desde' y 'Hasta'". */
  desde: 'Desde',
  hasta: 'Hasta',

  /** LITERAL - US-DASH-05: "el boton 'Aplicar' permanece deshabilitado". */
  aplicar: 'Aplicar',

  /**
   * LITERAL - US-DASH-05, rango invertido en el modo "Personalizado".
   *
   * NO es el mismo texto que `filtrosAuditoriaSchema` (US-AUD-02), que dice
   * "...posterior a la de fin.". Son dos historias distintas y cada una fija el
   * suyo: unificarlos romperia una de las dos pruebas de la Etapa 6.
   */
  rangoInvertido:
    'La fecha de inicio no puede ser posterior a la fecha de fin.',
} as const;

/**
 * Modulo de Mensajeria directa (US-MSG-01 a US-MSG-07, RF073 a RF079).
 *
 * Dos pantallas: PAN-MSG-01 (lista de conversaciones) y PAN-MSG-02
 * (conversacion). La conversacion es SIEMPRE 1 a 1 y esta normalizada por el
 * par de UUID, asi que "iniciar" un chat que ya existe abre el hilo de siempre.
 *
 * EL TUTEO DE "Todavia no tienes conversaciones." ES DEL DOCUMENTO, no un
 * descuido. US-MSG-04 lo escribe asi, igual que RF076, y el resto del sistema
 * vosea. Gana el criterio de aceptacion: es lo que verifica la prueba funcional
 * de la Etapa 6. Mismo criterio que se aplico en MENSAJES_DASHBOARD.
 */
export const MENSAJES_MENSAJERIA = {
  // --- Inicio de la conversacion (US-MSG-01) --------------------------------
  /**
   * LITERAL - US-MSG-01: "El cliente presiona el boton 'Enviar mensaje' desde
   * el perfil publico de un cocinero". Es tambien el rotulo del acceso desde
   * la pantalla de seguimiento del pedido.
   */
  enviarMensaje: 'Enviar mensaje',

  /**
   * LITERAL - US-MSG-01, cocinero con la cuenta SUSPENDIDA. Ademas de mostrar
   * el texto, "no habilite el campo de entrada".
   *
   * Dice "Este cocinero" porque el criterio esta escrito desde el punto de
   * vista del cliente, el unico actor de US-MSG-01. El caso simetrico -un
   * cocinero escribiendole a un cliente suspendido- no lo cubre ningun
   * criterio: la interfaz usa ahi un texto propio (ver TEXTOS_MENSAJERIA).
   */
  cocineroNoDisponible:
    'Este cocinero no se encuentra disponible en este momento. No es posible enviar mensajes.',

  /**
   * PROPIO - el caso simetrico del anterior: un cocinero que le escribe a un
   * CLIENTE suspendido.
   *
   * Ningun criterio lo cubre, porque el unico actor de US-MSG-01 es el cliente.
   * Reusar el literal seria peor que redactar este: le diria "este cocinero" a
   * alguien que esta mirando el perfil de un cliente. Y `MENSAJES_AUTH.
   * cuentaSuspendida` tampoco sirve, porque esta escrito en segunda persona
   * ("Tu cuenta...") para quien fue suspendido, no para quien le escribe.
   *
   * Calcado del literal salvo por el sujeto, para que las dos variantes se lean
   * como el mismo mensaje del sistema.
   */
  interlocutorNoDisponible:
    'Esta persona no se encuentra disponible en este momento. No es posible enviar mensajes.',

  /**
   * LITERAL - US-MSG-01: "La cuenta del destinatario fue eliminada entre el
   * acceso al perfil y el envio". Es la carrera entre abrir el perfil y tocar
   * "Enviar": lo responde la API al rechazar el POST, no la pantalla.
   */
  destinatarioEliminado: 'El destinatario ya no forma parte de la plataforma.',

  // --- Envio de texto (US-MSG-02) -------------------------------------------
  /**
   * LITERAL - US-MSG-02: "un indicador de estado: Enviando / Enviado /
   * Entregado / Leido".
   *
   * "Enviando" NO es un valor de `ESTADO_MENSAJE`: es el mensaje optimista que
   * todavia no confirmo la API. Los otros tres si son el ENUM de la base.
   */
  estadoEnviando: 'Enviando',
  estadoEnviado: 'Enviado',
  estadoEntregado: 'Entregado',
  estadoLeido: 'Leído',

  /** LITERAL - US-MSG-02: "presiona 'Enviar'". */
  enviar: 'Enviar',

  // --- Imagenes (US-MSG-03) -------------------------------------------------
  /**
   * LITERAL - US-MSG-03: "Muestre las opciones: 'Tomar foto' (abre la camara
   * del dispositivo) y 'Elegir de la galeria'".
   */
  tomarFoto: 'Tomar foto',
  elegirDeLaGaleria: 'Elegir de la galería',

  /**
   * LITERAL - US-MSG-03 y RF075, formato o tamano no admitido.
   *
   * El tope de 8 MB es propio del chat y NO el de 5 MB de la foto de perfil o
   * del plato: son tres criterios de aceptacion distintos y cada uno fija el
   * suyo (ver MAXIMO_IMAGEN_MENSAJE_BYTES).
   */
  imagenInvalida:
    'El archivo debe ser una imagen JPG, PNG o WEBP de hasta 8 MB.',

  /** LITERAL - US-MSG-03: "los botones 'Enviar' y 'Cancelar'". */
  cancelar: 'Cancelar',

  /** LITERAL - US-MSG-03: "con las opciones 'Descargar' y 'Cerrar'". */
  descargar: 'Descargar',
  cerrar: 'Cerrar',

  /**
   * LITERAL - US-MSG-03: "muestre un icono de 'Error' sobre la burbuja del
   * mensaje junto al texto 'No se pudo enviar' y, al tocar el icono, reintente
   * el envio automaticamente".
   */
  noSePudoEnviar: 'No se pudo enviar',

  // --- Listado de conversaciones (US-MSG-04) --------------------------------
  /** LITERAL - US-MSG-04: "accede a la seccion 'Mensajes' desde el menu principal". */
  mensajes: 'Mensajes',

  /**
   * LITERAL - US-MSG-04, estado vacio del listado. CON TUTEO: asi lo escriben
   * la historia y el requisito. Ver la nota de arriba.
   */
  sinConversaciones: 'Todavía no tienes conversaciones.',

  /** LITERAL - US-MSG-04: "Muestre el boton 'Archivar'". */
  archivar: 'Archivar',

  /** LITERAL - US-MSG-04: "traslade la conversacion al filtro 'Archivados'". */
  archivados: 'Archivados',

  /**
   * PROPIO - la accion inversa, en el gesto de deslizar del listado.
   *
   * US-MSG-04 solo nombra "Archivar". El listado ya sabia devolver una
   * conversacion al filtro principal, pero rotulaba ese boton con el nombre de
   * la pestana ("Activos"), que no se lee como una accion.
   */
  desarchivar: 'Desarchivar',

  /** LITERAL - US-MSG-04, busqueda sin resultados. */
  sinResultadosDeBusqueda:
    'No se encontraron conversaciones con esos criterios.',

  /** LITERAL - US-MSG-04: "junto a la opcion 'Limpiar filtros'". */
  limpiarFiltros: 'Limpiar filtros',

  // --- Historial (US-MSG-05) ------------------------------------------------
  /**
   * LITERAL - US-MSG-05: "Muestre el indicador 'Escribiendo...' en la parte
   * inferior del chat". Tres puntos suspensivos como tres caracteres, tal como
   * lo escribe el criterio, y no el caracter de elipsis.
   */
  escribiendo: 'Escribiendo...',

  /**
   * LITERAL - US-MSG-05: "Muestre las opciones: 'Ver perfil' (redirige al
   * perfil publico del interlocutor) y 'Archivar conversacion'".
   */
  verPerfil: 'Ver perfil',
  archivarConversacion: 'Archivar conversación',

  /**
   * PROPIO - US-MSG-05 solo enumera "Archivar conversacion". La hoja de la
   * cabecera ofrecia siempre esa opcion, incluso sobre una conversacion ya
   * archivada, donde no tenia ningun efecto.
   */
  desarchivarConversacion: 'Desarchivar conversación',

  // --- Hilo del pedido (US-MSG-06) ------------------------------------------
  /**
   * LITERAL - US-MSG-06: "Muestre un boton 'Mensajes del pedido' que redirige
   * al hilo de chat asociado a ese pedido especifico".
   *
   * El hilo se resuelve por el par cliente-cocinero del pedido y no por una
   * columna `pedido_id` en `conversacion`: el diagrama vigente DG12082026_V5 no
   * la tiene y el indice unico `conversacion_par_uq` admite UNA sola
   * conversacion por par, tenga el par uno o diez pedidos (decision del equipo,
   * 2026-08-21).
   */
  mensajesDelPedido: 'Mensajes del pedido',

  // --- Interlocutor dado de baja (US-MSG-07) --------------------------------
  /**
   * LITERAL - US-MSG-07 y RF079: "Deshabilite el campo de entrada de mensajes y
   * muestre el mensaje". El historial previo sigue visible.
   */
  conversacionBloqueadaPorBaja:
    'Esta conversación está archivada porque el usuario ya no forma parte de la plataforma.',

  /**
   * LITERAL - US-MSG-07: "Muestre el texto 'Usuario no disponible' en lugar del
   * nombre original y oculte el boton 'Ver perfil'".
   */
  usuarioNoDisponible: 'Usuario no disponible',
} as const;

/**
 * Errores de Supabase Auth que tienen un texto nuestro aprobado.
 *
 * GoTrue responde en ingles y con su propio vocabulario. Los flujos que hablan
 * directo con el -el login (US-AUT-03) y el restablecimiento por enlace de
 * US-AUT-04- no pasan por la API, asi que su error no llega como el
 * `{ codigo, mensaje }` que los clientes saben traducir y terminaba degradado a
 * `MENSAJES_ERROR.interno`.
 *
 * LA LISTA ES CORTA A PROPOSITO: solo entran codigos cuyo texto en espanol ya
 * existe y esta comprometido con un criterio de aceptacion. Cualquier otro
 * sigue cayendo al mensaje generico, que es lo que evita filtrar detalle
 * tecnico de GoTrue a la interfaz.
 */
/**
 * Codigo con el que GoTrue rechaza el ingreso de una cuenta baneada.
 *
 * Se nombra porque lo miran DOS lugares por separado: este mapa y el default
 * del formulario de login, que no puede usar el mapa —su caso normal es
 * `credencialesInvalidas`, no el mensaje generico—.
 */
export const CODIGO_SUPABASE_CUENTA_BANEADA = 'user_banned';

export const MENSAJES_POR_CODIGO_SUPABASE: Readonly<Record<string, string>> = {
  /** US-AUT-04: la contrasena nueva es igual a la que ya tenia. */
  same_password: MENSAJES_USUARIO.contrasenaNuevaIgualAActual,

  /**
   * US-AUT-03: la cuenta esta suspendida. GoTrue rechaza el login antes de
   * emitir el token porque `suspenderUsuario` la deja baneada; sin esta
   * traduccion el usuario veia "credenciales incorrectas", que es justo lo que
   * el criterio de aceptacion NO quiere que se muestre.
   */
  [CODIGO_SUPABASE_CUENTA_BANEADA]: MENSAJES_AUTH.cuentaSuspendida,
};

/** Errores tecnicos, sin detalle del stack (requisito del modulo de seguridad). */
export const MENSAJES_ERROR = {
  interno: 'Ocurrió un error inesperado. Intentá nuevamente en unos minutos.',
  sinConexion: 'No pudimos conectarnos. Revisá tu conexión a internet.',
  demasiadasSolicitudes: 'Hiciste demasiadas solicitudes. Esperá un momento.',
  noEncontrado: 'No encontramos lo que buscabas.',
} as const;
