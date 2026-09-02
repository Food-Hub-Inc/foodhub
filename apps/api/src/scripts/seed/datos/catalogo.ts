/**
 * Entidades de referencia del Modulo de configuracion y parametros
 * (alcance 2.2.2.2.3).
 *
 * TODO LO DE ESTE ARCHIVO SON FILAS DE UN ABM, NO REQUERIMIENTOS. La
 * documentacion define que existan las tablas `categoria`, `motivo_cancelacion`
 * y `tipo_consulta` y quien las administra (US-CFG-01, US-CFG-02, US-AYU-05),
 * pero no fija su contenido: el administrador las carga desde PAN-ADM-04. Lo
 * que sigue son valores de ejemplo verosimiles para que las pantallas tengan
 * algo que mostrar despues de un reset.
 *
 * Los valores de `configuracion_sistema` SI estan fijados: se copian de las
 * migraciones 0004 y 0012, que a su vez replican `PARAMETROS_*_DEFAULT` de
 * @foodhub/shared. El reset vacia la tabla y las migraciones ya corrieron, asi
 * que si la seed no los repone la plataforma queda sin parametros.
 */

export interface SemillaCategoria {
  slug: string;
  nombre: string;
  descripcion: string;
  /** Archivo dentro de `imagenes/categorias/`. */
  imagen: string;
  activo: boolean;
}

/**
 * Diez categorias vigentes y dos dadas de baja.
 *
 * Las dos inactivas existen para probar la baja logica de US-CFG-01: no deben
 * aparecer en el selector de una publicacion nueva ni en el filtro del feed,
 * pero si en el listado del panel con su estado.
 */
export const CATEGORIAS: readonly SemillaCategoria[] = [
  {
    slug: 'empanadas',
    nombre: 'Empanadas',
    descripcion: 'Empanadas al horno y fritas, por unidad o por docena.',
    imagen: 'cat-empanadas.jpg',
    activo: true,
  },
  {
    slug: 'pastas',
    nombre: 'Pastas caseras',
    descripcion:
      'Pasta fresca del día: ravioles, sorrentinos, ñoquis y tallarines.',
    imagen: 'cat-pastas.jpg',
    activo: true,
  },
  {
    slug: 'milanesas',
    nombre: 'Milanesas',
    descripcion: 'Milanesas de carne, pollo y vegetales, con guarnición.',
    imagen: 'cat-milanesas.jpg',
    activo: true,
  },
  {
    slug: 'guisos',
    nombre: 'Guisos y locros',
    descripcion: 'Comida criolla de olla y cocción lenta.',
    imagen: 'cat-guisos.jpg',
    activo: true,
  },
  {
    slug: 'parrilla',
    nombre: 'Parrilla',
    descripcion: 'Cortes a la parrilla, achuras y pollo al disco.',
    imagen: 'cat-parrilla.jpg',
    activo: true,
  },
  {
    slug: 'vegetariana',
    nombre: 'Comida vegetariana',
    descripcion:
      'Platos sin carne: tartas, woks, bowls y hamburguesas de legumbres.',
    imagen: 'cat-vegetariana.jpg',
    activo: true,
  },
  {
    slug: 'panaderia',
    nombre: 'Panadería',
    descripcion: 'Pan artesanal, chipá y facturas recién horneadas.',
    imagen: 'cat-panaderia.jpg',
    activo: true,
  },
  {
    slug: 'pasteleria',
    nombre: 'Pastelería',
    descripcion: 'Tortas, tartas dulces y alfajores por encargo.',
    imagen: 'cat-pasteleria.jpg',
    activo: true,
  },
  {
    slug: 'postres',
    nombre: 'Postres',
    descripcion: 'Postres individuales listos para servir.',
    imagen: 'cat-postres.jpg',
    activo: true,
  },
  {
    slug: 'viandas',
    nombre: 'Viandas semanales',
    descripcion: 'Comidas porcionadas para la semana, listas para calentar.',
    imagen: 'cat-viandas.jpg',
    activo: true,
  },
  {
    slug: 'arabe',
    nombre: 'Comida árabe',
    descripcion: 'Shawarma, kepi y esfihas.',
    imagen: 'cat-arabe.jpg',
    activo: false,
  },
  {
    slug: 'sushi',
    nombre: 'Sushi',
    descripcion: 'Piezas frías y rolls.',
    imagen: 'cat-sushi.jpg',
    activo: false,
  },
];

/** Los tres valores fijos que siembra la migracion 0003. */
export const TIPOS_USUARIO_CANCELACION = [
  'COCINERO',
  'CLIENTE',
  'AMBOS',
] as const;
export type TipoUsuarioCancelacionSemilla =
  (typeof TIPOS_USUARIO_CANCELACION)[number];

export interface SemillaMotivoCancelacion {
  nombre: string;
  aplicableA: TipoUsuarioCancelacionSemilla;
  activo: boolean;
}

/**
 * Motivos del selector de rechazo y cancelacion.
 *
 * `aplicableA` es lo que impide que un cliente elija "no tengo ingredientes":
 * cada parte ve solo los motivos de su tipo mas los de tipo AMBOS.
 */
export const MOTIVOS_CANCELACION: readonly SemillaMotivoCancelacion[] = [
  {
    nombre: 'No tengo ingredientes disponibles',
    aplicableA: 'COCINERO',
    activo: true,
  },
  {
    nombre: 'No llego con los tiempos de preparación',
    aplicableA: 'COCINERO',
    activo: true,
  },
  {
    nombre: 'La dirección de entrega queda fuera de mi zona',
    aplicableA: 'COCINERO',
    activo: true,
  },
  { nombre: 'Cerré por hoy', aplicableA: 'COCINERO', activo: true },
  { nombre: 'Cambié de opinión', aplicableA: 'CLIENTE', activo: true },
  { nombre: 'Me equivoqué en el pedido', aplicableA: 'CLIENTE', activo: true },
  {
    nombre: 'Encontré una opción más cercana',
    aplicableA: 'CLIENTE',
    activo: true,
  },
  {
    nombre: 'Ya no lo necesito para este horario',
    aplicableA: 'CLIENTE',
    activo: true,
  },
  { nombre: 'Problema de salud', aplicableA: 'AMBOS', activo: true },
  {
    nombre: 'No nos pusimos de acuerdo con la entrega',
    aplicableA: 'AMBOS',
    activo: true,
  },
  // Dado de baja: prueba que un motivo deshabilitado siga visible en los
  // pedidos historicos que lo referencian pero no se ofrezca al cancelar.
  { nombre: 'Corte de luz en la zona', aplicableA: 'AMBOS', activo: false },
];

/** Clasificacion de los tickets de soporte (US-AYU-05). */
export const TIPOS_CONSULTA: readonly { nombre: string; activo: boolean }[] = [
  { nombre: 'Problema con un pedido', activo: true },
  { nombre: 'Problema con mi cuenta', activo: true },
  { nombre: 'Problema con una publicación', activo: true },
  { nombre: 'Reportar a un usuario', activo: true },
  { nombre: 'Sugerencia de mejora', activo: true },
  { nombre: 'Consulta general', activo: true },
  { nombre: 'Facturación', activo: false },
  // US-AYU-03: el formulario de "Contactar al soporte" muestra CUATRO valores
  // literales (Consulta general, Reporte de problema, Sugerencia de mejora,
  // Denuncia). Los dos que faltaban contra la base se agregan aca para que un
  // reset no los pierda; la migracion 0013 los siembra sin resetear.
  { nombre: 'Reporte de problema', activo: true },
  { nombre: 'Denuncia', activo: true },
];

/** Los dos roles que segmentan el contenido de ayuda (migracion 0002). */
export const ROLES_DESTINO = ['CLIENTE', 'COCINERO'] as const;

/**
 * Parametros operativos. Copia literal de las migraciones 0004 y 0012: el
 * reset trunca `configuracion_sistema` y esas migraciones ya figuran como
 * aplicadas, de modo que no vuelven a correr.
 */
export const CONFIGURACION_SISTEMA: readonly {
  clave: string;
  valor: string;
  descripcion: string;
}[] = [
  {
    clave: 'radio_busqueda_defecto_km',
    valor: '5',
    descripcion:
      'Radio, en kilómetros, que usa el feed y el mapa para mostrar cocineros cercanos por defecto.',
  },
  {
    clave: 'distancia_maxima_filtro_km',
    valor: '20',
    descripcion:
      'Distancia máxima que un cliente puede seleccionar en el filtro de búsqueda.',
  },
  {
    clave: 'feed_publicaciones_por_pagina',
    valor: '20',
    descripcion:
      'Cantidad de publicaciones que se cargan por página en el feed.',
  },
  {
    clave: 'pedido_tiempo_cancelacion_cliente_minutos',
    valor: '5',
    descripcion:
      'Minutos que tiene el cliente para cancelar un pedido en estado "Creado".',
  },
  {
    clave: 'pedido_expiracion_minutos',
    valor: '15',
    descripcion:
      'Minutos que tiene el cocinero para aceptar o rechazar un pedido antes de que expire automáticamente.',
  },
  {
    clave: 'resena_minimo_para_promedio',
    valor: '3',
    descripcion:
      'Cantidad mínima de reseñas que necesita un cocinero para mostrar su valoración promedio pública.',
  },
  {
    clave: 'resena_limite_dias_para_resenar',
    valor: '14',
    descripcion:
      'Días, tras completar un pedido, que tiene el cliente para dejar una reseña.',
  },
  {
    clave: 'plataforma_nombre',
    valor: 'FoodHub',
    descripcion:
      'Nombre de la plataforma, visible en la app y en las comunicaciones.',
  },
  {
    clave: 'plataforma_logo_url',
    valor: '',
    descripcion: 'Logo de la plataforma.',
  },
  {
    clave: 'plataforma_correo_soporte',
    valor: 'soporte@foodhub.com',
    descripcion:
      'Correo de contacto que se muestra a los usuarios para soporte.',
  },
  {
    clave: 'plataforma_horario_atencion_soporte',
    valor:
      '{"LUNES":{"inicio":"09:00","fin":"18:00"},"MARTES":{"inicio":"09:00","fin":"18:00"},"MIERCOLES":{"inicio":"09:00","fin":"18:00"},"JUEVES":{"inicio":"09:00","fin":"18:00"},"VIERNES":{"inicio":"09:00","fin":"18:00"},"SABADO":null,"DOMINGO":null}',
    descripcion:
      'Horario de atencion del equipo de soporte que se muestra al usuario en la pantalla "Contacto del soporte" (US-AYU-04).',
  },
];
