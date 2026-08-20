import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Parser } from 'htmlparser2';
import PDFDocument from 'pdfkit';

/**
 * Generacion de PDF para los documentos legales que descarga la app movil
 * (US-AYU-04, CA5).
 *
 * El HTML ya viene sanitizado del modulo de Configuracion
 * (`terminos.service.ts` allowlist: p, br, strong, em, u, ul, ol, li, h1-3, a).
 * Esta capa NO vuelve a sanitizar: solo traduce ese subset conocido de tags
 * a primitivas de pdfkit. Cualquier tag que el parser encuentre fuera de la
 * allowlist cae como texto plano (defensa en profundidad: si por algun motivo
 * llegara HTML malicioso, pdfkit igual lo renderiza como texto y no ejecuta
 * scripts).
 */

interface Segmento {
  texto: string;
  negrita?: boolean;
  cursiva?: boolean;
  /** URL del enlace si el segmento viene de un <a href="...">. */
  href?: string;
}

type Bloque =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; texto: string }
  | { tipo: 'parrafo'; segmentos: Segmento[] }
  | { tipo: 'lista'; items: Segmento[][] };

type BloquesParseados = Bloque[];

type MarcoPila =
  | { tag: 'h1' | 'h2' | 'h3'; nivel: 1 | 2 | 3; segmentos: Segmento[] }
  | { tag: 'p'; segmentos: Segmento[] }
  | { tag: 'ul' | 'ol'; items: Segmento[][] }
  | { tag: 'li'; items: Segmento[] }
  | { tag: 'strong' | 'em' | 'texto' }
  | { tag: 'a'; hrefActual?: string };

/**
 * Parsea el HTML y devuelve bloques planos. La complejidad se reparte entre
 * metodos chiquitos para que cada uno quede por debajo del umbral de ESLint
 * (`complexity: 12`).
 */
class ConstructorDeBloques {
  readonly bloques: BloquesParseados = [];
  readonly pila: MarcoPila[] = [];
  bufferTexto = '';

  abrir(nombre: string, attribs: Record<string, string>): void {
    this.flushBuffer();
    if (this.esEncabezado(nombre)) {
      this.pila.push({
        tag: nombre,
        nivel: this.nivelDe(nombre),
        segmentos: [],
      });
      return;
    }
    if (nombre === 'p') {
      this.pila.push({ tag: 'p', segmentos: [] });
      return;
    }
    if (nombre === 'ul' || nombre === 'ol') {
      this.pila.push({ tag: nombre, items: [] });
      return;
    }
    if (nombre === 'li') {
      this.pila.push({ tag: 'li', items: [] });
      return;
    }
    if (nombre === 'strong' || nombre === 'b') {
      this.pila.push({ tag: 'strong' });
      return;
    }
    if (nombre === 'em' || nombre === 'i') {
      this.pila.push({ tag: 'em' });
      return;
    }
    if (nombre === 'br') {
      this.bufferTexto += '\n';
      return;
    }
    if (nombre === 'a') {
      this.apilarAncla(attribs.href);
      return;
    }
    // <u> no se modela: pdfkit no tiene underline inline por segmento y el
    // texto sigue siendo legible sin el subrayado. Tags fuera de la
    // allowlist (incluido <script>) caen como texto literal (defensa en
    // profundidad).
    this.pila.push({ tag: 'texto' });
  }

  private esEncabezado(nombre: string): nombre is 'h1' | 'h2' | 'h3' {
    return nombre === 'h1' || nombre === 'h2' || nombre === 'h3';
  }

  private nivelDe(nombre: 'h1' | 'h2' | 'h3'): 1 | 2 | 3 {
    if (nombre === 'h1') return 1;
    if (nombre === 'h2') return 2;
    return 3;
  }

  private apilarAncla(href: string | undefined): void {
    this.pila.push(
      href !== undefined ? { tag: 'a', hrefActual: href } : { tag: 'a' },
    );
  }

  texto(texto: string): void {
    this.bufferTexto += texto;
  }

  cerrar(): void {
    this.flushBuffer();
    const marco = this.pila.pop();
    if (!marco) return;
    if (marco.tag === 'h1' || marco.tag === 'h2' || marco.tag === 'h3') {
      this.emitirTitulo(marco);
      return;
    }
    if (marco.tag === 'p') {
      this.bloques.push({ tipo: 'parrafo', segmentos: marco.segmentos });
      return;
    }
    if (marco.tag === 'ul' || marco.tag === 'ol') {
      this.bloques.push({ tipo: 'lista', items: marco.items });
      return;
    }
    if (marco.tag === 'li') this.consolidarItem(marco);
  }

  private emitirTitulo(marco: {
    tag: 'h1' | 'h2' | 'h3';
    nivel: 1 | 2 | 3;
    segmentos: Segmento[];
  }): void {
    this.bloques.push({
      tipo: 'titulo',
      nivel: marco.nivel,
      texto: marco.segmentos.map((s) => s.texto).join(''),
    });
  }

  private consolidarItem(marco: { tag: 'li'; items: Segmento[] }): void {
    const padre = this.pila[this.pila.length - 1];
    if (padre?.tag === 'ul' || padre?.tag === 'ol') {
      padre.items.push(marco.items);
    }
  }

  private flushBuffer(): void {
    if (!this.bufferTexto) return;
    const marco = this.pila[this.pila.length - 1];
    if (!marco) {
      this.bufferTexto = '';
      return;
    }
    const segmento = this.segmentoDesdeBuffer(marco);
    this.adjuntarSegmento(segmento);
    this.bufferTexto = '';
  }

  private segmentoDesdeBuffer(marco: MarcoPila): Segmento {
    if (marco.tag === 'a' && marco.hrefActual !== undefined) {
      return { texto: this.bufferTexto, href: marco.hrefActual };
    }
    if (marco.tag === 'strong')
      return { texto: this.bufferTexto, negrita: true };
    if (marco.tag === 'em') return { texto: this.bufferTexto, cursiva: true };
    return { texto: this.bufferTexto };
  }

  private adjuntarSegmento(segmento: Segmento): void {
    const actual = this.pila[this.pila.length - 1];
    if (!actual) return;
    if (actual.tag === 'h1' || actual.tag === 'h2' || actual.tag === 'h3') {
      actual.segmentos.push(segmento);
      return;
    }
    if (actual.tag === 'p') {
      actual.segmentos.push(segmento);
      return;
    }
    if (actual.tag === 'li') {
      actual.items.push(segmento);
      return;
    }
    if (actual.tag === 'a') this.adjuntarHijoDeAncla(segmento);
  }

  /**
   * El texto dentro de `<a>` se acumula contra el abuelo: un `<a>` solo
   * lleva marcas inline, no acumula por si mismo.
   */
  private adjuntarHijoDeAncla(segmento: Segmento): void {
    const abuelo = this.pila[this.pila.length - 2];
    if (!abuelo) return;
    if (
      abuelo.tag === 'h1' ||
      abuelo.tag === 'h2' ||
      abuelo.tag === 'h3' ||
      abuelo.tag === 'p'
    ) {
      abuelo.segmentos.push(segmento);
      return;
    }
    if (abuelo.tag === 'li') abuelo.items.push(segmento);
  }
}

function parsearHtmlComoBloques(html: string): BloquesParseados {
  const c = new ConstructorDeBloques();
  const parser = new Parser(
    {
      onopentag: (nombre, attribs) => {
        c.abrir(nombre, attribs);
      },
      ontext: (texto) => {
        c.texto(texto);
      },
      onclosetag: () => {
        c.cerrar();
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  return c.bloques;
}

/**
 * Configuracion visual del PDF. Vive aca y no en un `.css` porque pdfkit no
 * usa CSS: aplica estilo inline a cada `text()`.
 */
const TIPOGRAFIA = {
  cuerpo: 'Helvetica',
  cuerpoNegrita: 'Helvetica-Bold',
  cuerpoCursiva: 'Helvetica-Oblique',
  titulo: 'Helvetica-Bold',
};
const TAMAÑOS = {
  titulo1: 18,
  titulo2: 15,
  titulo3: 13,
  parrafo: 11,
};
const COLOR_PRIMARIO = '#EC6829';
const COLOR_TEXTO = '#1F1A17';
const COLOR_SECUNDARIO = '#57514C';

/**
 * Buffer del isotipo que se embebe en la cabecera de cada documento. Se lee
 * una sola vez en el primer uso para no pagar el I/O en cada descarga.
 */
let cacheIsotipo: Buffer | null = null;
function cargarIsotipo(): Buffer {
  if (cacheIsotipo) return cacheIsotipo;
  const aqui = dirname(fileURLToPath(import.meta.url));
  const ruta = join(aqui, '..', 'assets', 'isotipo-foodhub.png');
  cacheIsotipo = readFileSync(ruta);
  return cacheIsotipo;
}

function pintarSegmento(doc: PDFKit.PDFDocument, segmento: Segmento): void {
  if (segmento.negrita) doc.font(TIPOGRAFIA.cuerpoNegrita);
  else if (segmento.cursiva) doc.font(TIPOGRAFIA.cuerpoCursiva);
  else doc.font(TIPOGRAFIA.cuerpo);
  const texto = segmento.href
    ? `${segmento.texto} [${segmento.href}]`
    : segmento.texto;
  doc.text(texto, { continued: true });
}

/**
 * Escribe una secuencia de segmentos en una sola linea del PDF. pdfkit
 * mantiene la fuente activa entre llamadas a `text({ continued: true })`,
 * asi que cambiamos la fuente antes de cada segmento con marca.
 */
function escribirConEstilos(
  doc: PDFKit.PDFDocument,
  segmentos: Segmento[],
): void {
  segmentos.forEach((s) => {
    pintarSegmento(doc, s);
  });
  doc.font(TIPOGRAFIA.cuerpo);
  doc.text('', { lineBreak: true });
}

function pintarCabecera(
  doc: PDFKit.PDFDocument,
  titulo: string,
  fechaPublicacion: string,
): void {
  try {
    doc.image(cargarIsotipo(), 50, 50, { width: 40 });
  } catch {
    // Si el asset desaparecio, el PDF sigue siendo valido sin logo.
  }
  doc.font(TIPOGRAFIA.titulo).fontSize(16).fillColor(COLOR_PRIMARIO);
  doc.text(titulo, 100, 55, { width: 445 });
  doc.font(TIPOGRAFIA.cuerpo).fontSize(10).fillColor(COLOR_SECUNDARIO);
  doc.text(`Última actualización: ${fechaPublicacion}`, 100, 80, {
    width: 445,
  });
  doc.moveDown(2);
  doc.fillColor(COLOR_TEXTO);
}

function tamañoDeTitulo(nivel: 1 | 2 | 3): number {
  if (nivel === 1) return TAMAÑOS.titulo1;
  if (nivel === 2) return TAMAÑOS.titulo2;
  return TAMAÑOS.titulo3;
}

function pintarBloque(doc: PDFKit.PDFDocument, bloque: Bloque): void {
  if (bloque.tipo === 'titulo') {
    doc.moveDown(0.6);
    doc
      .font(TIPOGRAFIA.titulo)
      .fontSize(tamañoDeTitulo(bloque.nivel))
      .fillColor(COLOR_TEXTO);
    doc.text(bloque.texto);
    doc.moveDown(0.3);
    doc.font(TIPOGRAFIA.cuerpo).fontSize(TAMAÑOS.parrafo);
    return;
  }
  if (bloque.tipo === 'parrafo') {
    doc.fontSize(TAMAÑOS.parrafo);
    escribirConEstilos(doc, bloque.segmentos);
    doc.moveDown(0.4);
    return;
  }
  doc.fontSize(TAMAÑOS.parrafo);
  bloque.items.forEach((item) => {
    doc.text('• ', { continued: true });
    escribirConEstilos(doc, item);
  });
  doc.moveDown(0.4);
}

interface EntradaDocumentoPdf {
  titulo: string;
  fechaPublicacion: string;
  bloques: BloquesParseados;
}

async function armarPdfEnBuffer(entrada: EntradaDocumentoPdf): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: entrada.titulo, CreationDate: new Date() },
  });

  const chunks: Buffer[] = [];
  const terminado = new Promise<Buffer>((resolver, rechazar) => {
    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on('end', () => {
      resolver(Buffer.concat(chunks));
    });
    doc.on('error', rechazar);
  });

  pintarCabecera(doc, entrada.titulo, entrada.fechaPublicacion);
  entrada.bloques.forEach((bloque) => {
    pintarBloque(doc, bloque);
  });
  doc.end();
  return terminado;
}

/**
 * US-AYU-04, CA5 - Punto de entrada unico para generar el PDF de un
 * documento legal vigente. Compone titulo, fecha y bloques en el PDF.
 */
export async function armarPdfDeDocumentoLegal(entrada: {
  titulo: string;
  fechaPublicacion: Date;
  contenidoHtml: string;
}): Promise<Buffer> {
  return armarPdfEnBuffer({
    titulo: entrada.titulo,
    fechaPublicacion: entrada.fechaPublicacion.toISOString().slice(0, 10),
    bloques: parsearHtmlComoBloques(entrada.contenidoHtml),
  });
}

/** Helper expuesto para tests: parsear HTML a bloques sin generar el PDF. */
export function parsearHtmlParaPdf(html: string): BloquesParseados {
  return parsearHtmlComoBloques(html);
}

/** Helper para tests: contar palabras renderizadas. */
export function contarPalabras(html: string): number {
  const total = (segmentos: Segmento[]) =>
    segmentos.reduce(
      (acc, s) => acc + s.texto.split(/\s+/).filter(Boolean).length,
      0,
    );
  return parsearHtmlComoBloques(html).reduce((acc, bloque) => {
    if (bloque.tipo === 'parrafo') return acc + total(bloque.segmentos);
    if (bloque.tipo === 'lista') {
      return acc + bloque.items.reduce((sub, item) => sub + total(item), 0);
    }
    return acc + bloque.texto.split(/\s+/).filter(Boolean).length;
  }, 0);
}

export type { Segmento, Bloque, BloquesParseados };
