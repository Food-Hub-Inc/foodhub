/**
 * Catalogo de platos del dataset.
 *
 * No es una tabla del modelo: es la MATERIA PRIMA con la que se arman las
 * publicaciones. Cada cocinero publica los platos de sus especialidades, con
 * su propio precio derivado de `precioBase`. Por eso el mismo plato (por
 * ejemplo "Empanadas de carne") aparece publicado por varios cocineros a
 * precios distintos, que es lo que hace util el filtro por precio del feed
 * (US-EXP-03) y el orden por precio del listado.
 *
 * `precioBase` esta en pesos argentinos y en el orden de magnitud de agosto de
 * 2026 segun los precios de referencia del rubro. `tiempoPreparacion` esta en
 * minutos y alimenta `publicacion.tiempo_estimado_preparacion`.
 */

export interface SemillaPlato {
  slug: string;
  nombre: string;
  descripcion: string;
  /** `slug` de una categoria de datos/catalogo.ts. */
  categoria: string;
  precioBase: number;
  tiempoPreparacion: number;
  /** Archivo dentro de `imagenes/platos/`. */
  imagen: string;
}

export const PLATOS: readonly SemillaPlato[] = [
  // --- Empanadas -------------------------------------------------------------
  {
    slug: 'empanadas-carne',
    nombre: 'Empanadas de carne cortada a cuchillo (docena)',
    descripcion:
      'Docena de empanadas de carne cortada a cuchillo, con cebolla de verdeo, huevo y aceitunas. Repulgue a mano y horneadas a pedido.',
    categoria: 'empanadas',
    precioBase: 14500,
    tiempoPreparacion: 40,
    imagen: 'empanadas-carne.jpg',
  },
  {
    slug: 'empanadas-humita',
    nombre: 'Empanadas de humita (docena)',
    descripcion:
      'Docena de empanadas de humita con choclo rallado, salsa blanca y un toque de albahaca. Aptas vegetarianas.',
    categoria: 'empanadas',
    precioBase: 13200,
    tiempoPreparacion: 40,
    imagen: 'empanadas-humita.jpg',
  },
  {
    slug: 'empanadas-jamon-queso',
    nombre: 'Empanadas de jamón y queso (docena)',
    descripcion:
      'Docena de empanadas de jamón cocido y mozzarella, horneadas hasta que el queso se estira.',
    categoria: 'empanadas',
    precioBase: 12800,
    tiempoPreparacion: 35,
    imagen: 'empanadas-jamon-queso.jpg',
  },
  {
    slug: 'empanadas-pollo',
    nombre: 'Empanadas de pollo (docena)',
    descripcion:
      'Docena de empanadas de pollo desmenuzado con morrón, cebolla y un toque de pimentón.',
    categoria: 'empanadas',
    precioBase: 13500,
    tiempoPreparacion: 40,
    imagen: 'empanadas-pollo.jpg',
  },

  // --- Pastas caseras --------------------------------------------------------
  {
    slug: 'ravioles-jamon-queso',
    nombre: 'Ravioles caseros de jamón y queso',
    descripcion:
      'Plancha de ravioles de masa fina rellenos de jamón y mozzarella. Se entregan crudos con la salsa aparte, listos para hervir.',
    categoria: 'pastas',
    precioBase: 11900,
    tiempoPreparacion: 50,
    imagen: 'ravioles-jamon-queso.jpg',
  },
  {
    slug: 'sorrentinos',
    nombre: 'Sorrentinos de jamón y mozzarella',
    descripcion:
      'Sorrentinos grandes de pasta fresca rellenos de jamón, mozzarella y albahaca, con tuco casero.',
    categoria: 'pastas',
    precioBase: 13400,
    tiempoPreparacion: 55,
    imagen: 'sorrentinos.jpg',
  },
  {
    slug: 'noquis-papa',
    nombre: 'Ñoquis de papa con salsa boloñesa',
    descripcion:
      'Ñoquis caseros de papa con salsa boloñesa de cocción lenta y queso rallado aparte. Porción para dos.',
    categoria: 'pastas',
    precioBase: 10800,
    tiempoPreparacion: 45,
    imagen: 'noquis-papa.jpg',
  },
  {
    slug: 'lasana-carne',
    nombre: 'Lasaña de carne',
    descripcion:
      'Lasaña de seis capas con boloñesa, salsa blanca y mozzarella gratinada. Se entrega en fuente descartable lista para horno.',
    categoria: 'pastas',
    precioBase: 16800,
    tiempoPreparacion: 70,
    imagen: 'lasana-carne.jpg',
  },
  {
    slug: 'canelones-verdura',
    nombre: 'Canelones de verdura y ricota',
    descripcion:
      'Canelones rellenos de espinaca y ricota con salsa mixta. Doce unidades, aptos vegetarianos.',
    categoria: 'pastas',
    precioBase: 15200,
    tiempoPreparacion: 65,
    imagen: 'canelones-verdura.jpg',
  },
  {
    slug: 'tallarines-huevo',
    nombre: 'Tallarines caseros al huevo con tuco',
    descripcion:
      'Tallarines al huevo amasados el mismo día, con tuco de carne y queso rallado. Porción para dos.',
    categoria: 'pastas',
    precioBase: 10400,
    tiempoPreparacion: 40,
    imagen: 'tallarines-huevo.jpg',
  },

  // --- Milanesas -------------------------------------------------------------
  {
    slug: 'milanesa-napolitana',
    nombre: 'Milanesa napolitana con papas fritas',
    descripcion:
      'Milanesa de nalga con salsa de tomate, jamón y mozzarella gratinada, con papas fritas abundantes.',
    categoria: 'milanesas',
    precioBase: 15600,
    tiempoPreparacion: 35,
    imagen: 'milanesa-napolitana.jpg',
  },
  {
    slug: 'milanesa-pollo',
    nombre: 'Milanesa de pollo a caballo',
    descripcion:
      'Milanesa de pechuga de pollo con dos huevos fritos y puré de papas casero.',
    categoria: 'milanesas',
    precioBase: 13900,
    tiempoPreparacion: 30,
    imagen: 'milanesa-pollo.jpg',
  },
  {
    slug: 'milanesa-berenjena',
    nombre: 'Berenjenas a la parmesana',
    descripcion:
      'Berenjenas empanadas al horno con salsa de tomate y queso. Opción vegetariana de la milanesa napolitana.',
    categoria: 'milanesas',
    precioBase: 12600,
    tiempoPreparacion: 45,
    imagen: 'milanesa-berenjena.jpg',
  },

  // --- Guisos y locros -------------------------------------------------------
  {
    slug: 'locro-criollo',
    nombre: 'Locro criollo (porción individual)',
    descripcion:
      'Locro de maíz blanco, porotos, zapallo y carne de cerdo, cocinado seis horas. Se entrega con quiquirimichi aparte.',
    categoria: 'guisos',
    precioBase: 11800,
    tiempoPreparacion: 60,
    imagen: 'locro-criollo.jpg',
  },
  {
    slug: 'guiso-lentejas',
    nombre: 'Guiso de lentejas con chorizo',
    descripcion:
      'Guiso espeso de lentejas con chorizo colorado, panceta y verduras. Porción abundante.',
    categoria: 'guisos',
    precioBase: 10600,
    tiempoPreparacion: 55,
    imagen: 'guiso-lentejas.jpg',
  },
  {
    slug: 'carbonada-criolla',
    nombre: 'Carbonada criolla',
    descripcion:
      'Carbonada con carne, zapallo, choclo y duraznos, servida en cazuela. Receta cuyana.',
    categoria: 'guisos',
    precioBase: 12400,
    tiempoPreparacion: 65,
    imagen: 'carbonada-criolla.jpg',
  },

  // --- Parrilla --------------------------------------------------------------
  {
    slug: 'asado-tira',
    nombre: 'Asado de tira (1 kg)',
    descripcion:
      'Un kilo de asado de tira a la parrilla, con chimichurri casero y ensalada criolla.',
    categoria: 'parrilla',
    precioBase: 24500,
    tiempoPreparacion: 90,
    imagen: 'asado-tira.jpg',
  },
  {
    slug: 'vacio-horno',
    nombre: 'Vacío al horno con papas',
    descripcion:
      'Vacío cocinado cuatro horas a baja temperatura, con papas y cebollas asadas en la misma bandeja.',
    categoria: 'parrilla',
    precioBase: 26800,
    tiempoPreparacion: 120,
    imagen: 'vacio-horno.jpg',
  },
  {
    slug: 'pollo-disco',
    nombre: 'Pollo al disco',
    descripcion:
      'Pollo al disco con morrones, cebolla y papas. Porción para dos o tres personas.',
    categoria: 'parrilla',
    precioBase: 18200,
    tiempoPreparacion: 75,
    imagen: 'pollo-disco.jpg',
  },
  {
    slug: 'chorizos-caseros',
    nombre: 'Chorizos caseros a la parrilla (6 unidades)',
    descripcion:
      'Media docena de chorizos caseros de cerdo asados a la parrilla, con pan y chimichurri.',
    categoria: 'parrilla',
    precioBase: 13600,
    tiempoPreparacion: 45,
    imagen: 'chorizos-caseros.jpg',
  },

  // --- Comida vegetariana ----------------------------------------------------
  {
    slug: 'tarta-pascualina',
    nombre: 'Tarta pascualina casera',
    descripcion:
      'Tarta de acelga, huevo y queso con masa hojaldrada hecha en casa. Ocho porciones.',
    categoria: 'vegetariana',
    precioBase: 11200,
    tiempoPreparacion: 60,
    imagen: 'tarta-pascualina.jpg',
  },
  {
    slug: 'wok-vegetales',
    nombre: 'Wok de vegetales con arroz integral',
    descripcion:
      'Salteado de brócoli, zanahoria, morrón y cebolla de verdeo con salsa de soja y arroz integral.',
    categoria: 'vegetariana',
    precioBase: 10900,
    tiempoPreparacion: 30,
    imagen: 'wok-vegetales.jpg',
  },
  {
    slug: 'hamburguesa-lentejas',
    nombre: 'Hamburguesas de lentejas (4 unidades)',
    descripcion:
      'Cuatro medallones de lentejas y avena, listos para sellar en sartén. Veganos.',
    categoria: 'vegetariana',
    precioBase: 9400,
    tiempoPreparacion: 35,
    imagen: 'hamburguesa-lentejas.png',
  },
  {
    slug: 'ensalada-quinoa',
    nombre: 'Ensalada de quinoa con vegetales',
    descripcion:
      'Quinoa con tomate cherry, palta, zanahoria y semillas, con aderezo de limón aparte.',
    categoria: 'vegetariana',
    precioBase: 9800,
    tiempoPreparacion: 25,
    imagen: 'ensalada-quinoa.jpg',
  },

  // --- Panaderia -------------------------------------------------------------
  {
    slug: 'pan-campo',
    nombre: 'Pan casero de campo',
    descripcion:
      'Hogaza de un kilo de miga firme y corteza gruesa, horneada a la mañana.',
    categoria: 'panaderia',
    precioBase: 5200,
    tiempoPreparacion: 180,
    imagen: 'pan-campo.jpg',
  },
  {
    slug: 'medialunas',
    nombre: 'Medialunas de manteca (docena)',
    descripcion:
      'Docena de medialunas de manteca con almíbar, recién horneadas.',
    categoria: 'panaderia',
    precioBase: 8600,
    tiempoPreparacion: 120,
    imagen: 'medialunas.jpg',
  },
  {
    slug: 'pan-masa-madre',
    nombre: 'Pan de masa madre',
    descripcion:
      'Pan de fermentación natural de 24 horas, sin levadura comercial. Se entrega entero.',
    categoria: 'panaderia',
    precioBase: 7400,
    tiempoPreparacion: 240,
    imagen: 'pan-masa-madre.jpg',
  },
  {
    slug: 'chipa',
    nombre: 'Chipá casero (12 unidades)',
    descripcion: 'Doce chipás de almidón de mandioca y queso, calientes.',
    categoria: 'panaderia',
    precioBase: 6800,
    tiempoPreparacion: 45,
    imagen: 'chipa.jpg',
  },

  // --- Pasteleria ------------------------------------------------------------
  {
    slug: 'torta-chocolate',
    nombre: 'Torta de chocolate (8 porciones)',
    descripcion:
      'Torta húmeda de chocolate con ganache y relleno de dulce de leche. Se encarga con un día de anticipación.',
    categoria: 'pasteleria',
    precioBase: 19800,
    tiempoPreparacion: 120,
    imagen: 'torta-chocolate.jpg',
  },
  {
    slug: 'lemon-pie',
    nombre: 'Lemon pie',
    descripcion:
      'Tarta de limón con base de masa sablée y merengue italiano quemado. Ocho porciones.',
    categoria: 'pasteleria',
    precioBase: 16400,
    tiempoPreparacion: 100,
    imagen: 'lemon-pie.jpg',
  },
  {
    slug: 'cheesecake-frutos-rojos',
    nombre: 'Cheesecake de frutos rojos',
    descripcion:
      'Cheesecake horneado con base de galleta y salsa de frutos rojos casera. Ocho porciones.',
    categoria: 'pasteleria',
    precioBase: 18900,
    tiempoPreparacion: 110,
    imagen: 'cheesecake-frutos-rojos.jpg',
  },
  {
    slug: 'alfajores-maicena',
    nombre: 'Alfajores de maicena (docena)',
    descripcion:
      'Docena de alfajores de maicena rellenos de dulce de leche repostero y coco rallado.',
    categoria: 'pasteleria',
    precioBase: 9600,
    tiempoPreparacion: 90,
    imagen: 'alfajores-maicena.jpg',
  },
  {
    slug: 'pastafrola',
    nombre: 'Pastafrola de membrillo',
    descripcion:
      'Pastafrola clásica de membrillo con enrejado, ocho porciones.',
    categoria: 'pasteleria',
    precioBase: 11400,
    tiempoPreparacion: 80,
    imagen: 'pastafrola.jpg',
  },

  // --- Postres ---------------------------------------------------------------
  {
    slug: 'flan-dulce-leche',
    nombre: 'Flan casero con dulce de leche',
    descripcion:
      'Flan de huevo con caramelo y una cucharada generosa de dulce de leche.',
    categoria: 'postres',
    precioBase: 5400,
    tiempoPreparacion: 60,
    imagen: 'flan-dulce-leche.jpg',
  },
  {
    slug: 'tiramisu',
    nombre: 'Tiramisú individual',
    descripcion:
      'Tiramisú en copa con vainillas embebidas en café y crema de mascarpone.',
    categoria: 'postres',
    precioBase: 6200,
    tiempoPreparacion: 50,
    imagen: 'tiramisu.jpg',
  },
  {
    slug: 'budin-pan',
    nombre: 'Budín de pan con dulce de leche',
    descripcion:
      'Budín de pan casero con caramelo y dulce de leche. Seis porciones.',
    categoria: 'postres',
    precioBase: 7800,
    tiempoPreparacion: 70,
    imagen: 'budin-pan.jpg',
  },
  {
    slug: 'mousse-chocolate',
    nombre: 'Mousse de chocolate',
    descripcion:
      'Mousse de chocolate semiamargo en copa individual, con crema y virutas.',
    categoria: 'postres',
    precioBase: 5900,
    tiempoPreparacion: 45,
    imagen: 'mousse-chocolate.jpg',
  },

  // --- Viandas semanales -----------------------------------------------------
  {
    slug: 'vianda-ejecutiva',
    nombre: 'Vianda semanal ejecutiva (5 comidas)',
    descripcion:
      'Cinco viandas variadas para la semana, porcionadas y etiquetadas, listas para calentar.',
    categoria: 'viandas',
    precioBase: 42000,
    tiempoPreparacion: 240,
    imagen: 'vianda-ejecutiva.jpg',
  },
  {
    slug: 'vianda-fitness',
    nombre: 'Vianda semanal fitness (5 comidas)',
    descripcion:
      'Cinco viandas con control de porciones: proteína magra, vegetales y carbohidrato integral.',
    categoria: 'viandas',
    precioBase: 45500,
    tiempoPreparacion: 240,
    imagen: 'vianda-fitness.jpg',
  },
  {
    slug: 'tuppers-bolognesa',
    nombre: 'Tuppers de salsa boloñesa (3 unidades)',
    descripcion:
      'Tres tuppers de medio kilo de salsa boloñesa de cocción lenta, para congelar.',
    categoria: 'viandas',
    precioBase: 16800,
    tiempoPreparacion: 120,
    imagen: 'tuppers-bolognesa.jpg',
  },
  {
    slug: 'vianda-vegetariana',
    nombre: 'Vianda semanal vegetariana (5 comidas)',
    descripcion:
      'Cinco viandas sin carne: legumbres, cereales y verduras de estación.',
    categoria: 'viandas',
    precioBase: 39800,
    tiempoPreparacion: 240,
    imagen: 'vianda-vegetariana.jpg',
  },
];

/** Indice por categoria, para elegir que publica cada cocinero. */
export function platosPorCategoria(categoria: string): SemillaPlato[] {
  return PLATOS.filter((plato) => plato.categoria === categoria);
}
