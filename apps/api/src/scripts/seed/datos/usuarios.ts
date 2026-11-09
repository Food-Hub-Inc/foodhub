import type { TipoUsuario } from '@foodhub/shared';

/**
 * Las 27 cuentas del dataset: 15 cocineros, 6 clientes y 6 administradores.
 *
 * LOS CORREOS DE LOS ADMINISTRADORES SON REALES: son las cuentas del Grupo 21
 * y hay que poder entrar al panel con ellas despues de cada reset. Los nombres
 * salen del historial de git del repositorio. Los cocineros y los clientes son
 * personas ficticias con la convencion nombre.apellido@gmail.com.
 *
 * `slug` es la clave estable de cada persona: nombra su avatar en
 * `imagenes/perfiles/` y es lo que usan los demas modulos de la seed para
 * referirse a ella sin depender del orden del arreglo.
 */

/** Mezcla de estados finales de los pedidos de un cocinero. */
export interface MezclaEstadosPedido {
  /** Entregado y cobrado. */
  completado: number;
  /** El cocinero rechazo el pedido (US-PED-04). */
  rechazadoPorCocinero: number;
  /** El cliente lo cancelo antes de que lo aceptaran (US-PED-09). */
  canceladoPorCliente: number;
  /** Expiro sin respuesta del cocinero (US-PED-10). */
  tiempoAgotado: number;
}

/** Que tan bien lo califican sus clientes. Sesga las estrellas de las resenas. */
export type TendenciaReputacion = 'excelente' | 'buena' | 'irregular';

export interface SemillaUsuario {
  slug: string;
  nombre: string;
  apellido: string;
  email: string;
  tipo: TipoUsuario;
  /** Barrio o departamento del Gran Mendoza. Solo documenta la ubicacion. */
  zona?: string;
  /** Punto en SRID 4326. `x` es la longitud y `y` la latitud (orden PostGIS). */
  ubicacion?: { x: number; y: number };
  descripcionPublica?: string;
  /** Categorias que cocina. Determina que platos publica. */
  especialidades?: string[];
  /**
   * Cuantos pedidos historicos recibio. Ronda los 50 que pidio el equipo, con
   * dispersion deliberada: un cocinero con 28 pedidos y otro con 71 hacen que
   * el ranking del panel y el dashboard tengan algo que ordenar.
   */
  pedidos?: number;
  mezclaEstados?: MezclaEstadosPedido;
  tendencia?: TendenciaReputacion;
}

/**
 * COCINEROS - repartidos por los seis departamentos del Gran Mendoza
 * (Capital, Godoy Cruz, Guaymallen, Las Heras, Maipu y Lujan de Cuyo).
 *
 * Las coordenadas son puntos reales de cada barrio. Importa que esten
 * separadas de verdad: el feed por cercania (RF014), el mapa (RF015) y el
 * filtro por distancia (RF017) no se pueden probar si los quince cocineros
 * caen sobre la misma manzana.
 */
export const COCINEROS: readonly SemillaUsuario[] = [
  {
    slug: 'ana.lucero',
    nombre: 'Ana',
    apellido: 'Lucero',
    email: 'ana.lucero@gmail.com',
    tipo: 'COCINERO',
    zona: 'Ciudad de Mendoza - Barrio Cívico',
    ubicacion: { x: -68.8458, y: -32.8895 },
    descripcionPublica:
      'Cocino empanadas mendocinas de repulgue a mano, como las hacía mi abuela en Guaymallén. Amaso todos los días a la mañana y salen del horno recién hechas.',
    especialidades: ['empanadas', 'pasteleria'],
    pedidos: 64,
    mezclaEstados: {
      completado: 78,
      rechazadoPorCocinero: 8,
      canceladoPorCliente: 9,
      tiempoAgotado: 5,
    },
    tendencia: 'excelente',
  },
  {
    slug: 'bruno.salinas',
    nombre: 'Bruno',
    apellido: 'Salinas',
    email: 'bruno.salinas@gmail.com',
    tipo: 'COCINERO',
    zona: 'Ciudad de Mendoza - Quinta Sección',
    ubicacion: { x: -68.857, y: -32.885 },
    descripcionPublica:
      'Pastas frescas de masa fina, hechas el mismo día. Ravioles, sorrentinos y ñoquis con salsas de cocción lenta. Sin conservantes.',
    especialidades: ['pastas'],
    pedidos: 58,
    mezclaEstados: {
      completado: 74,
      rechazadoPorCocinero: 10,
      canceladoPorCliente: 10,
      tiempoAgotado: 6,
    },
    tendencia: 'buena',
  },
  {
    slug: 'carla.dominguez',
    nombre: 'Carla',
    apellido: 'Domínguez',
    email: 'carla.dominguez@gmail.com',
    tipo: 'COCINERO',
    zona: 'Ciudad de Mendoza - Sexta Sección',
    ubicacion: { x: -68.848, y: -32.879 },
    descripcionPublica:
      'Repostería casera por encargo: tortas, lemon pie, cheesecake y alfajores de maicena. Trabajo con pedidos de un día para el otro.',
    especialidades: ['pasteleria', 'postres'],
    pedidos: 71,
    mezclaEstados: {
      completado: 82,
      rechazadoPorCocinero: 5,
      canceladoPorCliente: 8,
      tiempoAgotado: 5,
    },
    tendencia: 'excelente',
  },
  {
    slug: 'diego.peralta',
    nombre: 'Diego',
    apellido: 'Peralta',
    email: 'diego.peralta@gmail.com',
    tipo: 'COCINERO',
    zona: 'Godoy Cruz - Centro',
    ubicacion: { x: -68.878, y: -32.925 },
    descripcionPublica:
      'Milanesas grandes, tiernas y bien empanadas: napolitana, a caballo o de berenjena, siempre con guarnición generosa. Los días de frío sumo guisos de olla.',
    especialidades: ['milanesas', 'guisos'],
    pedidos: 49,
    mezclaEstados: {
      completado: 70,
      rechazadoPorCocinero: 12,
      canceladoPorCliente: 11,
      tiempoAgotado: 7,
    },
    tendencia: 'buena',
  },
  {
    slug: 'elena.quiroga',
    nombre: 'Elena',
    apellido: 'Quiroga',
    email: 'elena.quiroga@gmail.com',
    tipo: 'COCINERO',
    zona: 'Godoy Cruz - San Francisco del Monte',
    ubicacion: { x: -68.895, y: -32.908 },
    descripcionPublica:
      'Comida criolla de olla: locro, guiso de lentejas y carbonada. Cocino a fuego lento en cazuela de barro, como corresponde.',
    especialidades: ['guisos', 'empanadas'],
    pedidos: 53,
    mezclaEstados: {
      completado: 76,
      rechazadoPorCocinero: 9,
      canceladoPorCliente: 9,
      tiempoAgotado: 6,
    },
    tendencia: 'buena',
  },
  {
    slug: 'federico.iglesias',
    nombre: 'Federico',
    apellido: 'Iglesias',
    email: 'federico.iglesias@gmail.com',
    tipo: 'COCINERO',
    zona: 'Godoy Cruz - Villa Hipódromo',
    ubicacion: { x: -68.869, y: -32.933 },
    descripcionPublica:
      'Parrilla a domicilio. Asado de tira, vacío al horno, chorizos caseros y pollo al disco, con empanadas al horno para arrancar. Aviso apenas está listo para que llegue caliente.',
    especialidades: ['parrilla', 'empanadas'],
    pedidos: 44,
    mezclaEstados: {
      completado: 66,
      rechazadoPorCocinero: 14,
      canceladoPorCliente: 12,
      tiempoAgotado: 8,
    },
    tendencia: 'irregular',
  },
  {
    slug: 'gabriela.moyano',
    nombre: 'Gabriela',
    apellido: 'Moyano',
    email: 'gabriela.moyano@gmail.com',
    tipo: 'COCINERO',
    zona: 'Guaymallén - Villa Nueva',
    ubicacion: { x: -68.821, y: -32.888 },
    descripcionPublica:
      'Cocina vegetariana todos los días: tartas de verdura, wok de vegetales, hamburguesas de lentejas y ensaladas de quinoa.',
    especialidades: ['vegetariana', 'viandas'],
    pedidos: 56,
    mezclaEstados: {
      completado: 79,
      rechazadoPorCocinero: 7,
      canceladoPorCliente: 9,
      tiempoAgotado: 5,
    },
    tendencia: 'excelente',
  },
  {
    slug: 'hernan.bustos',
    nombre: 'Hernán',
    apellido: 'Bustos',
    email: 'hernan.bustos@gmail.com',
    tipo: 'COCINERO',
    zona: 'Guaymallén - Dorrego',
    ubicacion: { x: -68.813, y: -32.884 },
    descripcionPublica:
      'Panadería artesanal de barrio: pan de campo, masa madre, chipá y medialunas. También hago tortas y tartas dulces por encargo. Horneo de madrugada, entrego a la mañana.',
    especialidades: ['panaderia', 'pasteleria'],
    pedidos: 38,
    mezclaEstados: {
      completado: 72,
      rechazadoPorCocinero: 11,
      canceladoPorCliente: 10,
      tiempoAgotado: 7,
    },
    tendencia: 'buena',
  },
  {
    slug: 'irene.vazquez',
    nombre: 'Irene',
    apellido: 'Vázquez',
    email: 'irene.vazquez@gmail.com',
    tipo: 'COCINERO',
    zona: 'Guaymallén - San José',
    ubicacion: { x: -68.828, y: -32.892 },
    descripcionPublica:
      'Viandas semanales para llevar al trabajo. Cinco comidas por semana, congeladas y etiquetadas, con opción vegetariana.',
    especialidades: ['viandas', 'pastas'],
    pedidos: 62,
    mezclaEstados: {
      completado: 84,
      rechazadoPorCocinero: 5,
      canceladoPorCliente: 7,
      tiempoAgotado: 4,
    },
    tendencia: 'excelente',
  },
  {
    slug: 'joaquin.ferreyra',
    nombre: 'Joaquín',
    apellido: 'Ferreyra',
    email: 'joaquin.ferreyra@gmail.com',
    tipo: 'COCINERO',
    zona: 'Las Heras - Centro',
    ubicacion: { x: -68.83, y: -32.847 },
    descripcionPublica:
      'Empanadas y pizzas caseras al horno de barro. Los fines de semana hago tandas grandes para juntadas.',
    especialidades: ['empanadas', 'milanesas'],
    pedidos: 41,
    mezclaEstados: {
      completado: 64,
      rechazadoPorCocinero: 15,
      canceladoPorCliente: 12,
      tiempoAgotado: 9,
    },
    tendencia: 'irregular',
  },
  {
    slug: 'karina.ledesma',
    nombre: 'Karina',
    apellido: 'Ledesma',
    email: 'karina.ledesma@gmail.com',
    tipo: 'COCINERO',
    zona: 'Las Heras - El Challao',
    ubicacion: { x: -68.89, y: -32.834 },
    descripcionPublica:
      'Postres caseros de los de siempre: flan con dulce de leche, budín de pan, mousse de chocolate y tiramisú. Tortas y alfajores, con un día de anticipación.',
    especialidades: ['postres', 'pasteleria'],
    pedidos: 47,
    mezclaEstados: {
      completado: 77,
      rechazadoPorCocinero: 8,
      canceladoPorCliente: 10,
      tiempoAgotado: 5,
    },
    tendencia: 'buena',
  },
  {
    slug: 'leandro.ojeda',
    nombre: 'Leandro',
    apellido: 'Ojeda',
    email: 'leandro.ojeda@gmail.com',
    tipo: 'COCINERO',
    zona: 'Maipú - Centro',
    ubicacion: { x: -68.785, y: -32.976 },
    descripcionPublica:
      'Comida casera de todos los días a precio razonable. Milanesas, guisos y pastas, con porciones para dos.',
    especialidades: ['milanesas', 'guisos', 'pastas'],
    pedidos: 68,
    mezclaEstados: {
      completado: 75,
      rechazadoPorCocinero: 9,
      canceladoPorCliente: 10,
      tiempoAgotado: 6,
    },
    tendencia: 'buena',
  },
  {
    slug: 'marina.toledo',
    nombre: 'Marina',
    apellido: 'Toledo',
    email: 'marina.toledo@gmail.com',
    tipo: 'COCINERO',
    zona: 'Maipú - Coquimbito',
    ubicacion: { x: -68.796, y: -32.96 },
    descripcionPublica:
      'Pastelería y panadería sin conservantes. Pastafrola, torta de chocolate y pan de masa madre de fermentación larga.',
    especialidades: ['pasteleria', 'panaderia'],
    pedidos: 35,
    mezclaEstados: {
      completado: 80,
      rechazadoPorCocinero: 7,
      canceladoPorCliente: 8,
      tiempoAgotado: 5,
    },
    tendencia: 'excelente',
  },
  {
    slug: 'nahuel.guzman',
    nombre: 'Nahuel',
    apellido: 'Guzmán',
    email: 'nahuel.guzman@gmail.com',
    tipo: 'COCINERO',
    zona: 'Luján de Cuyo - Centro',
    ubicacion: { x: -68.88, y: -33.039 },
    descripcionPublica:
      'Asado y comida de campo para llevar. Trabajo con carne de la zona y cocino a leña.',
    especialidades: ['parrilla', 'guisos'],
    pedidos: 28,
    mezclaEstados: {
      completado: 61,
      rechazadoPorCocinero: 16,
      canceladoPorCliente: 13,
      tiempoAgotado: 10,
    },
    tendencia: 'irregular',
  },
  {
    slug: 'paula.bianchi',
    nombre: 'Paula',
    apellido: 'Bianchi',
    email: 'paula.bianchi@gmail.com',
    tipo: 'COCINERO',
    zona: 'Luján de Cuyo - Chacras de Coria',
    ubicacion: { x: -68.879, y: -32.983 },
    descripcionPublica:
      'Cocina de estación con verduras de la finca. Menú vegetariano, tartas y viandas saludables por encargo.',
    especialidades: ['vegetariana', 'viandas', 'postres'],
    pedidos: 51,
    mezclaEstados: {
      completado: 81,
      rechazadoPorCocinero: 6,
      canceladoPorCliente: 8,
      tiempoAgotado: 5,
    },
    tendencia: 'excelente',
  },
];

/**
 * CLIENTES - uno por departamento, para que el feed por cercania de cada uno
 * devuelva un conjunto de cocineros distinto.
 */
export const CLIENTES: readonly SemillaUsuario[] = [
  {
    slug: 'sofia.ramirez',
    nombre: 'Sofía',
    apellido: 'Ramírez',
    email: 'sofia.ramirez@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Ciudad de Mendoza - Quinta Sección',
    ubicacion: { x: -68.853, y: -32.886 },
  },
  {
    slug: 'tomas.ibanez',
    nombre: 'Tomás',
    apellido: 'Ibáñez',
    email: 'tomas.ibanez@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Godoy Cruz - Centro',
    ubicacion: { x: -68.883, y: -32.92 },
  },
  {
    slug: 'valentina.correa',
    nombre: 'Valentina',
    apellido: 'Correa',
    email: 'valentina.correa@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Guaymallén - Villa Nueva',
    ubicacion: { x: -68.815, y: -32.89 },
  },
  {
    slug: 'martin.aguirre',
    nombre: 'Martín',
    apellido: 'Aguirre',
    email: 'martin.aguirre@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Las Heras - Centro',
    ubicacion: { x: -68.834, y: -32.852 },
  },
  {
    slug: 'julieta.ponce',
    nombre: 'Julieta',
    apellido: 'Ponce',
    email: 'julieta.ponce@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Maipú - Centro',
    ubicacion: { x: -68.79, y: -32.972 },
  },
  {
    slug: 'emiliano.sosa',
    nombre: 'Emiliano',
    apellido: 'Sosa',
    email: 'emiliano.sosa@gmail.com',
    tipo: 'CLIENTE',
    zona: 'Luján de Cuyo - Chacras de Coria',
    ubicacion: { x: -68.876, y: -32.986 },
  },
];

/**
 * ADMINISTRADORES - las cuentas reales del Grupo 21.
 *
 * Sin ubicacion: el administrador trabaja en el panel web, no en el feed por
 * proximidad, y `usuario.ubicacion` solo es obligatoria para el cocinero
 * (CHECK `usuario_cocinero_con_ubicacion`).
 */
export const ADMINISTRADORES: readonly SemillaUsuario[] = [
  {
    slug: 'matias.telo',
    nombre: 'Matías',
    apellido: 'Telo',
    email: 'matias.telo000@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
  {
    slug: 'ezequiel.aguilar',
    nombre: 'Ezequiel',
    apellido: 'Aguilar',
    email: 'aguilarmaximilianoezequiel@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
  {
    slug: 'felipe.caceres',
    nombre: 'Felipe',
    apellido: 'Cáceres',
    email: 'felipecarlos.cr@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
  {
    slug: 'facundo.blangetti',
    nombre: 'Facundo',
    apellido: 'Blangetti',
    email: 'cufablangetti@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
  {
    slug: 'facundo.reche',
    nombre: 'Facundo',
    apellido: 'Reche',
    email: 'rechefacundo1@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
  {
    slug: 'nicolas.ocampo',
    nombre: 'Nicolás',
    apellido: 'Ocampo',
    email: 'nicoo2003@gmail.com',
    tipo: 'ADMINISTRADOR',
  },
];

export const USUARIOS: readonly SemillaUsuario[] = [
  ...ADMINISTRADORES,
  ...COCINEROS,
  ...CLIENTES,
];

/**
 * Contrasena unica de todas las cuentas del dataset.
 *
 * Cumple `passwordSchema` de @foodhub/shared (ocho caracteres, mayuscula,
 * minuscula y digito). Es publica a proposito: este dataset solo se carga en
 * `foodhub-dev` y el script se niega a correr contra otro ambiente.
 */
export const PASSWORD_DE_PRUEBA = 'Test1234';
