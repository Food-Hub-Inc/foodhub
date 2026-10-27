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

/** US-AYU-02 a US-AYU-03 · Hub y pantalla de preguntas frecuentes / contacto. */
export const TEXTOS_AYUDA = {
  titulo: 'Ayuda y soporte',
  preguntasFrecuentes: 'Preguntas frecuentes',
  manual: 'Manual de usuario',
  /**
   * [PROPIO] Entrada de contacto del hub: abre los datos de contacto
   * (correo y horarios) y desde ahi el boton lleva al formulario. La pantalla
   * concreta de "Contactar al soporte" no es entrada directa del hub
   * porque primero hay que mostrar el canal institucional.
   */
  contacto: 'Datos de contacto',
  legal: 'Información legal',
  buscar: 'Buscar preguntas',
  buscarPlaceholder: 'Escribí una palabra o frase',
  sinPreguntasTitulo: 'Todavía no hay preguntas frecuentes',
  sinPreguntasSubtitulo:
    'Estamos preparando contenido de ayuda para resolver tus dudas.',
  manualPendiente:
    'El manual reúne instrucciones paso a paso para usar FoodHub según tu rol.',

  /** [PROPIO] Búsqueda y estados del manual de usuario (US-AYU-01). */
  buscarManual: 'Buscar en el manual',
  buscarManualPlaceholder: 'Buscar temas, capítulos o palabras clave',
  sinCapitulosTitulo: 'Todavía no hay contenido en el manual',
  sinCapitulosSubtitulo:
    'Estamos preparando las guías paso a paso para tu rol.',
  capituloNoEncontrado:
    'El capítulo solicitado no existe o no se encuentra disponible.',

  /**
   * PAN-AYU-03 - Formulario de "Contactar al soporte" (US-AYU-03). Los
   * mensajes literales del criterio (confirmaciones, errores, success)
   * viven en `MENSAJES_AYUDA.consulta`. Acá va la copia no comprometida:
   * etiquetas de campos, placeholders y los textos de los botones.
   *
   * [PROPIO] todos los textos de este bloque: la maquetación no fija
   * ninguno y el criterio deja al equipo la decisión del wording exacto.
   */
  consulta: {
    /** Reusado por la pantalla de carga del archivo y el selector. */
    adjuntar: 'Adjuntar archivo',
    /** Etiqueta del boton que abre el selector de archivos del sistema. */
    botonAdjuntar: 'Adjuntar archivo',
    /** Etiqueta del boton que quita un adjunto de la lista. */
    botonQuitar: 'Quitar',
    /** Etiqueta del boton principal al pie del formulario. */
    botonEnviar: 'Enviar consulta',
    /** Etiqueta del campo "Asunto". */
    campoAsunto: 'Asunto',
    /** Etiqueta del area de texto "Descripción". */
    campoDescripcion: 'Descripción',
    /** Etiqueta del campo de solo lectura con el correo del usuario. */
    campoCorreo: 'Tu correo electrónico',
    /** Etiqueta del desplegable de tipo de consulta. */
    campoTipoConsulta: 'Tipo de consulta',
    /** Encabezado del bloque de adjuntos. */
    bloqueAdjuntos: 'Archivos adjuntos',
    /** Placeholder del campo Asunto. */
    placeholderAsunto: 'Contanos brevemente de qué se trata',
    /** Placeholder del area de descripcion. */
    placeholderDescripcion: 'Detallá tu consulta, sugerencia o reporte',
    /** Placeholder del desplegable de tipo de consulta cuando no hay valor. */
    placeholderTipoConsulta: 'Elegí un tipo de consulta',
    /**
     * Reusado en la pantalla de borradores para nominar el archivo. La
     * extension la completa la pantalla con el nombre real (ej. "foto.jpg").
     */
    adjuntoGenerico: 'Adjunto',
    /**
     * Tamano legible de un archivo, pasado a la pantalla por el selector. Lo
     * formatea `formatearTamano` con KB o MB segun corresponda.
     */
    tamanoDeAdjunto: (texto: string) => texto,
    /** Etiqueta accesible del boton Quitar. */
    quitarAccesible: (nombre: string) => `Quitar el adjunto ${nombre}`,
    /** Accion secundaria que vacia todos los campos y los adjuntos. */
    limpiar: 'Limpiar todos los campos',
  },
} as const;

/**
 * PAN-AYU-04 - Pantallas del sub-hub de Informacion legal (US-AYU-04).
 *
 * Los mensajes LITERALES (boton "Descargar PDF", encabezado "Contacto del
 * soporte" en el sub-hub) viven en `MENSAJES_AYUDA` (@foodhub/shared) y se
 * importan de ahi. Acá solo va la copia de cada pantalla: titulos,
 * placeholders y textos [PROPIO].
 */
export const TEXTOS_LEGAL = {
  pantallaTerminos: {
    /** [PROPIO] Titulo de la pantalla de Terminos y condiciones. */
    titulo: 'Términos y condiciones',
  },
  pantallaPrivacidad: {
    /** [PROPIO] Titulo de la pantalla de Politica de privacidad. */
    titulo: 'Política de privacidad',
  },
  pantallaContacto: {
    /** [PROPIO] Titulo de la pantalla de Contacto del soporte. */
    titulo: 'Contacto del soporte',
  },
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
   * rótulos de "Descripción" y "Categoría" reusan las claves homónimas que ya
   * existen más arriba en este mismo bloque -son, letra por letra, la misma
   * etiqueta que ya usan el detalle y la hoja de filtros- así que no se
   * repiten acá.
   *
   * "Precio" y "Tiempo estimado de preparación" SÍ tienen su propia clave acá
   * -`campoPrecio`/`campoTiempoEstimado`, con la unidad entre paréntesis- en
   * vez de reusar `tiempoEstimado` de más arriba: el campo del formulario
   * pide un número pelado sin unidad visible en el valor, a diferencia del
   * detalle, que ya la muestra ahí (`formatearPrecio`, `tiempoEstimadoMinutos`).
   */
  publicar: 'Publicar',
  cancelar: 'Cancelar',
  campoNombre: 'Nombre del plato',
  campoPrecio: 'Precio (ARS)',
  campoTiempoEstimado: 'Tiempo estimado de preparación (min)',
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
  /** [MOCKUP PAN-EXP-04] Solapa del perfil publico, junto a "Resenas". */
  solapaPlatos: 'Platos disponibles',

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
 * "Nuevas publicaciones de cocineros favoritos" (US-NOT-08, visible solo para
 * el cliente): la etiqueta es literal del criterio de aceptación de US-NOT-08.
 */
export const TEXTOS_PREFERENCIAS_NOTIFICACION = {
  /** [PROPIO] */
  titulo: 'Notificaciones',
  etiquetasCliente: {
    CAMBIO_ESTADO_PEDIDO: 'Cambios de estado de mis pedidos',
    MENSAJE_NUEVO: 'Mensajes nuevos en el chat',
    PUBLICACION_COCINERO_FAVORITO:
      'Nuevas publicaciones de cocineros favoritos',
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
 * PAN-NOT-01 · Historial de notificaciones (US-NOT-07).
 *
 * El único texto LITERAL del criterio es el estado vacío, que vive en
 * `MENSAJES_NOTIFICACION.historialVacio` (`@foodhub/shared`) y se importa de
 * ahí. Lo de acá es la copia [PROPIO] de la pantalla: título, la acción de la
 * cabecera y los encabezados de los grupos por día, que la maquetación dibuja
 * pero ningún criterio fija.
 */
export const TEXTOS_NOTIFICACIONES = {
  /** [PROPIO] Título de la pantalla (la maquetación lo escribe "Notificaciones"). */
  titulo: 'Notificaciones',
  /** [PROPIO] Acción de la cabecera del mockup. */
  marcarTodas: 'Marcar todas',
  /** [PROPIO] Etiqueta accesible del engranaje (US-NOT-07: lleva a PAN-NOT-02). */
  configurar: 'Configurar notificaciones',
  /**
   * [PROPIO] Encabezados de los grupos por día: los arma
   * `encabezadoDeDiaNotificacion` en `lib/formato.ts` ("Hoy", "Ayer" o la
   * fecha), igual criterio que el resto de las marcas de tiempo del módulo.
   */
  /** [PROPIO] Etiqueta accesible de una tarjeta no leída. */
  noLeida: 'No leída',
  /** [PROPIO] Se muestra al pie mientras entra la página siguiente. */
  cargandoMas: 'Cargando más…',
  /**
   * [PROPIO] Título de PAN-NOT-03, el detalle del aviso (US-NOT-04). La
   * pantalla no está en la maquetación; decisión del equipo del 13/10/2026.
   */
  tituloAviso: 'Aviso',
  /** [PROPIO] Lleva del detalle al historial completo. */
  verTodas: 'Ver todas las notificaciones',
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
/**
 * PAN-? · Perfil público del cliente — cuarto criterio de US-DASH-03.
 *
 * [PROPIO] TODOS. La pantalla no está en el inventario de la Etapa 5 ni tiene
 * criterios propios: el equipo la definió en la corrección del módulo de
 * Reseñas. Cuando le asignen un código PAN y la maqueten, estos textos son los
 * primeros que hay que contrastar.
 */
export const TEXTOS_PERFIL_CLIENTE = {
  titulo: 'Perfil del cliente',
  miembroDesde: (mesYAnio: string) => `Miembro desde ${mesYAnio}`,
  cuentaEliminada: 'Esta cuenta ya no está activa.',

  solapaResenas: 'Reseñas',
  solapaPedidos: 'Sus pedidos',

  /** Cuántos cocineros lo reseñaron, debajo del promedio. */
  cocinerosQueLoResenaron: (cantidad: number) =>
    cantidad === 1
      ? '1 cocinero lo reseñó'
      : `${String(cantidad)} cocineros lo reseñaron`,

  /** Cuántos platos más lleva el pedido, además del que se muestra. */
  masPlatos: (cantidad: number) =>
    cantidad === 1 ? 'y 1 plato más' : `y ${String(cantidad)} platos más`,

  sinPedidosConEsteCliente: 'Todavía no te hizo ningún pedido.',
  sinPedidosConEsteClienteSubtitulo:
    'Acá vas a ver el historial de lo que te pida.',

  /**
   * Un CLIENTE llegó por enlace directo. La ruta vive fuera del grupo
   * `(cocinero)`, así que es alcanzable; el endpoint responde 403 igual, pero
   * un error crudo de la API no explica nada.
   */
  soloParaCocineros: 'El perfil de un cliente solo pueden verlo los cocineros.',
} as const;

export const PANTALLAS_PENDIENTES = {
  pedidosCliente: {
    codigo: 'PAN-PED-05',
    modulo: 'Pedidos',
    titulo: 'Pedidos',
    descripcion:
      'Tus pedidos activos y tu historial, con el seguimiento de cada uno hasta que lo retirás.',
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
  /**
   * PAN-NOT-01 (US-NOT-07) ya está implementada: el placeholder se reemplazó
   * por la pantalla real en `src/screens/notificaciones/`. La entrada queda
   * eliminada para que `PANTALLAS_PENDIENTES` no la liste.
   */
  /**
   * Las pantallas de ayuda (US-AYU-01 y US-AYU-03) ya están implementadas;
   * los placeholders se reemplazaron por las pantallas reales en
   * `src/screens/ayuda/ManualDeUsuario.tsx` y `src/screens/ayuda/Contacto.tsx`.
   */
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
   * [PROPIO] Etiquetas accesibles de los accesos que salen del detalle del
   * pedido. Los criterios de US-PED-07 y US-PED-08 enumeran qué se muestra,
   * no cómo se anuncia.
   */
  verPublicacion: (nombre: string) => `Ver la publicación de ${nombre}`,

  /**
   * Neutral respecto del rol a propósito: `FichaDeParticipante` la comparten el
   * detalle del cliente y el del cocinero, y una etiqueta que nombre al
   * cocinero volvería a decirle al otro rol algo que no corresponde.
   */
  verPerfilDe: (nombre: string) => `Ver el perfil de ${nombre}`,

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

  /**
   * [PROPIO] Etiqueta accesible del gráfico semanal.
   *
   * El SVG queda oculto y el contenedor resume los siete valores acá: a
   * diferencia de la dona, debajo no hay un listado de texto que diga lo mismo.
   */
  pedidosPorDiaSemanaAccesible: 'Gráfico de pedidos por día de la semana',

  /** [PROPIO] Cantidad de pedidos en singular o plural, para los badges. */
  pedidosCantidad: (cantidad: number) =>
    `${String(cantidad)} ${cantidad === 1 ? 'pedido' : 'pedidos'}`,

  /** [PROPIO] Etiqueta accesible del gráfico de evolución (corrección 20/10). */
  evolucionAccesible: 'Gráfico de evolución de pedidos',

  /** [PROPIO] Rótulo accesible de un cubo semanal de la evolución. */
  semanaDel: (fecha: string) => `Semana del ${fecha}`,

  /** [PROPIO] Etiqueta accesible de una fila del ranking: abre su evolución. */
  verEvolucionDelPlato: (nombre: string) => `Ver la evolución de ${nombre}`,
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
  agregarFoto: 'Agregar foto',
  cambiarFoto: 'Cambiar foto',

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

  /**
   * [PROPIO] Titulos de los dos bloques del perfil publico (US-RES-03).
   *
   * SIN TITULOS LOS DOS BLOQUES SE LEEN COMO UNO SOLO CON DOS NUMEROS
   * CONTRADICTORIOS. El criterio pide que el listado de platos sea "un bloque
   * diferenciado" del de reputacion justamente porque miden cosas distintas, y
   * en pantalla eso se resuelve nombrandolas.
   */
  tituloResenasDePlatos: 'Reseñas de los platos',
  tituloResenasDelPlato: 'Reseñas de este plato',
  tituloOpinionesDelCocinero: 'Lo que dicen sus clientes',
  tituloResenasDelCliente: 'Lo que dicen otros cocineros',

  /** [PROPIO] Solapas de "Mis reseñas" del cocinero (PAN-RES-02). */
  solapaMisPlatos: 'Mis platos',
  solapaSobreMi: 'Sobre mí',

  /**
   * [PROPIO] Estados vacíos de las dos solapas.
   *
   * No se reusan los de US-RES-03 —"Este cocinero aún no recibió reseñas." y
   * "Se el primero en compartir tu experiencia."— porque son LITERALES escritos
   * para el CLIENTE que mira el perfil: acá el cocinero se está mirando a sí
   * mismo, y no puede ser el primero en opinar sobre su propio trabajo.
   */
  sinResenasEnMisPlatos: 'Todavía nadie reseñó tus platos.',
  sinResenasSobreMi: 'Todavía nadie te reseñó como cocinero.',

  /**
   * [PROPIO] Estado vacío del resumen, cuando el listado no tiene ni una.
   *
   * Es genérico a propósito: el mismo resumen encabeza los cuatro listados y
   * `MENSAJES_RESENA.cocineroSinResenasTitulo` -que decía "Este cocinero aún no
   * recibió reseñas."- es un LITERAL de US-RES-03 que habla del cocinero.
   * Debajo de un plato o de un cliente decía otra cosa.
   */
  sinResenasTodavia: 'Todavía no hay reseñas.',

  /** [PROPIO] Cuantas calificaciones de servicio recibio el cocinero. */
  calificacionesRecibidas: (cantidad: number) =>
    cantidad === 1
      ? '1 calificación recibida'
      : `${String(cantidad)} calificaciones recibidas`,

  /** [PROPIO] Estado vacio del bloque de reputacion. */
  sinCalificacionesDeServicio: 'Todavía no recibió calificaciones de servicio.',

  // --- PAN-RES-03, calificar al cocinero (US-RES-07) ------------------------
  /** [PROPIO] Titulos de la pantalla, uno por cada uno de sus dos modos. */
  tituloCalificarCocinero: 'Calificar al cocinero',
  tituloEditarMiCalificacion: 'Editar mi calificación',

  /**
   * [PROPIO] Encabezado del selector. La pregunta apunta al SERVICIO y no al
   * plato: es lo que separa esta pantalla de PAN-RES-01, y si el texto no lo
   * dice el cliente vuelve a calificar la comida.
   */
  etiquetaCalificacionCocinero: '¿Cómo fue la atención?',

  /** [PROPIO] Aviso al pie, para que no se confunda con la reseña del plato. */
  avisoCalificacionDeServicio:
    'Esto califica la atención del cocinero, no los platos. Cada plato se reseña por separado.',

  /**
   * [PROPIO] El cocinero no viajó en la navegación.
   *
   * Antes decía "no pudimos saber qué PEDIDO querés calificar": la reseña al
   * cocinero se anclaba a un pedido y se entraba desde su detalle. Ahora es una
   * sola por cocinero y se entra también desde su perfil.
   */
  sinCocinero:
    'No pudimos saber a qué cocinero querés reseñar. Entrá desde su perfil o desde el pedido.',

  /**
   * [PROPIO] Botón de reseñar al cocinero desde su perfil público.
   *
   * `sinDerecho` acompaña al botón deshabilitado. El criterio de US-RES-03 solo
   * dice cuándo mostrarlo, no qué decir cuando no corresponde; dejarlo apagado
   * sin explicación es de las cosas que más se leen como que la app está rota.
   */
  botonSinDerechoAResenar:
    'Vas a poder reseñarlo cuando te complete un pedido.',

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

  /** [MOCKUP PAN-RES-02] Titulo de la pantalla propia del cocinero. */
  tituloMisResenas: 'Mis reseñas',
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

  /**
   * [PROPIO] Los filtros no dejaron pasar ninguna resena, pero el cocinero SI
   * tiene. Es distinto de no tener ninguna y no se pueden confundir: ofrecer
   * "se el primero en opinar" con 87 resenas filtradas seria mentir.
   */
  sinResultadosConFiltros:
    'Ninguna reseña coincide con los filtros que elegiste.',

  /** [MOCKUP PAN-RES-02] Total del resumen: "87 resenas recibidas". */
  resenasRecibidas: (cantidad: number) =>
    cantidad === 1
      ? '1 reseña recibida'
      : `${String(cantidad)} reseñas recibidas`,

  /** [MOCKUP PAN-RES-02] Pie de cada tarjeta: "Sobre: Lasagna de verduras". */
  sobreElPlato: (nombrePlato: string) => `Sobre: ${nombrePlato}`,

  /** [PROPIO] Etiqueta accesible de la foto adjunta a una resena. */
  fotoDeLaResena: 'Foto de la reseña',

  // --- US-RES-05 y US-RES-06, lo social -------------------------------------
  /** [PROPIO] Marca en el menu de una resena que este usuario ya reporto. */
  yaReportada: 'Reportada',

  /** [PROPIO] Textos del formulario de reporte. El criterio no los redacta. */
  ayudaReporte:
    'Contanos qué problema encontraste. Un moderador va a revisar la reseña.',
  detalleOpcional: 'Detalle adicional (opcional)',
  detalleObligatorio: 'Detalle adicional (obligatorio)',
  placeholderDetalleReporte: 'Qué viste que no corresponde…',

  /** [PROPIO] Textos del formulario de respuesta del cocinero. */
  tituloResponder: 'Responder la reseña',
  etiquetaRespuesta: 'Tu respuesta',
  placeholderRespuesta: 'Gracias por tu comentario…',
  avisoRespuestaCongelada:
    'Ya pasó el plazo de 24 horas para editar esta respuesta.',
  respuestaPublicada: '¡Respuesta publicada!',
  /** [PROPIO] La resena que se esta respondiendo no traia comentario. */
  sinComentario: 'Sin comentario.',

  /**
   * [PROPIO] Confirmacion antes de retirar la propia resena (US-RES-06).
   *
   * El criterio ofrece la accion pero no pide confirmarla. Se confirma igual
   * porque es irreversible desde la app: la resena pasa a ELIMINADA_AUTOR y no
   * hay pantalla que la vuelva a publicar.
   */
  tituloBajaDeResena: '¿Eliminar tu reseña?',
  avisoBajaDeResena:
    'Tu reseña deja de verse en el perfil del cocinero y sale del promedio. No vas a poder volver a publicarla.',
  confirmarBaja: 'Eliminar',
  cancelarBaja: 'Cancelar',

  /**
   * [PROPIO] Galeria a pantalla completa de US-RES-03. El criterio describe el
   * comportamiento -"muestre una galeria en pantalla completa ... deslizando
   * lateralmente"- pero no fija ningun rotulo, asi que los escribe el equipo.
   */
  cerrarGaleria: 'Cerrar',
  posicionEnGaleria: (actual: number, total: number) =>
    `${String(actual)} de ${String(total)}`,

  /** [PROPIO] Etiqueta accesible de cada barra de la distribucion. */
  nivelAccesible: (nivel: number, porcentaje: number) =>
    `${String(nivel)} ${nivel === 1 ? 'estrella' : 'estrellas'}: ${String(porcentaje)}%`,

  /** [PROPIO] Marca de una resena editada, junto a la fecha original. */
  editada: '(editada)',
} as const;

/**
 * Textos de PAN-MSG-01 y PAN-MSG-02 que NO salen de un criterio de aceptación.
 *
 * Los literales del módulo —los estados del mensaje, los estados vacíos, los
 * textos de bloqueo, "Escribiendo...", "Archivar", "Ver perfil"— viven en
 * `MENSAJES_MENSAJERIA` (`@foodhub/shared`) y se importan de ahí. Acá queda sólo
 * lo que es de esta interfaz: etiquetas accesibles, placeholders y los rótulos
 * de apoyo que la documentación no dibuja.
 */
export const TEXTOS_MENSAJERIA = {
  /**
   * [PROPIO] Rótulo del filtro principal del listado.
   *
   * US-MSG-04 nombra sólo el otro ("el filtro 'Archivados'") y llama al primero
   * "el listado principal", que no sirve como rótulo de una pestaña.
   */
  filtroActivas: 'Activos',

  /** [PROPIO] Placeholder de la barra de búsqueda del listado (US-MSG-04). */
  buscarConversacion: 'Buscar por nombre',

  /** [PROPIO] Etiqueta accesible de la lista de filtros. */
  filtrosDeConversaciones: 'Filtros de conversaciones',

  /**
   * [PROPIO] "un acceso para explorar cocineros en el caso del cliente"
   * (US-MSG-04). El criterio pide el acceso, no fija su texto.
   */
  explorarCocineros: 'Explorar cocineros',

  /** [PROPIO] Estado vacío del filtro "Archivados", que el criterio no cubre. */
  sinArchivadas: 'No tenés conversaciones archivadas.',

  /** [PROPIO] Etiqueta accesible de cada fila del listado. */
  abrirConversacionCon: (nombre: string) =>
    `Abrir la conversación con ${nombre}`,

  /**
   * [PROPIO] Extracto del último mensaje cuando es una imagen: no hay texto que
   * recortar, así que la fila anuncia el tipo.
   */
  extractoDeImagen: 'Imagen',

  /** [PROPIO] Contador de no leídos, anunciado aparte del nombre. */
  cantidadNoLeidos: (cantidad: number) =>
    `${String(cantidad)} mensaje${cantidad === 1 ? '' : 's'} sin leer`,

  /**
   * [PROPIO] Indicador de presencia de la cabecera (US-MSG-01).
   *
   * La otra mitad del criterio —"última conexión hace X tiempo"— NO se muestra:
   * el sistema no registra la última conexión de nadie. La presencia sale del
   * canal de Realtime, que sólo sabe quién está conectado AHORA. Ver
   * PENDIENTE_PRESENCIA_MENSAJERIA.md.
   */
  enLinea: 'En línea',

  /** [PROPIO] Placeholder del campo de entrada del chat. */
  escribiUnMensaje: 'Escribí un mensaje',

  /** [PROPIO] Etiqueta accesible del ícono de adjuntar (US-MSG-03). */
  adjuntarImagen: 'Adjuntar imagen',

  /** [PROPIO] Etiqueta accesible del botón de envío. */
  enviarMensajeAccesible: 'Enviar el mensaje',

  /** [PROPIO] Etiqueta accesible del menú de la cabecera (US-MSG-05). */
  opcionesDeLaConversacion: 'Opciones de la conversación',

  /** [PROPIO] Título de la vista previa de la imagen a enviar (US-MSG-03). */
  vistaPreviaDeImagen: 'Vista previa',

  /** [PROPIO] Campo opcional que acompaña a la imagen (US-MSG-03). */
  pieDeImagen: 'Agregá un mensaje (opcional)',

  /** [PROPIO] Etiqueta accesible de una imagen recibida en el chat. */
  verImagenAmpliada: 'Ver la imagen ampliada',

  /** [PROPIO] Estado vacío de una conversación recién abierta, sin mensajes. */
  sinMensajes: 'Todavía no se enviaron mensajes en esta conversación.',

  /** [PROPIO] Se muestra mientras entra un bloque anterior del historial. */
  cargandoAnteriores: 'Cargando mensajes anteriores…',

  /** [PROPIO] Etiqueta accesible del reintento de un envío fallido (US-MSG-03). */
  reintentarEnvio: 'Reintentar el envío',

  /** [PROPIO] Falla al guardar el archivo compartido desde el visor. */
  noSePudoDescargar: 'No pudimos guardar la imagen. Intentá de nuevo.',
} as const;
