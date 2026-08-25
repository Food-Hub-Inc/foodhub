/**
 * Agrupa un documento legal (HTML sanitizado) en secciones delimitadas
 * por `<h2>`, para que PAN-AYU-04 muestre la politica de privacidad como
 * acordeon (CA3).
 *
 * El HTML que llega aca viene sanitizado del backend
 * (`apps/api/src/modules/configuracion/terminos.service.ts`) y solo
 * contiene la allowlist conocida: p, br, strong, em, u, ul, ol, li,
 * h1, h2, h3, a. Esta funcion hace una sola pasada y devuelve una lista
 * plana de secciones. Cada seccion arranca en un `<h2>` y se extiende
 * hasta el siguiente `<h2>` (o hasta el final).
 *
 * El texto previo al primer `<h2>` (si lo hay) se devuelve como una
 * seccion "inicial" con `titulo = ''`: asi una politica que arranque
 * con un parrafo de introduccion se ve igual que una que arranque con
 * la primera seccion.
 *
 * Si el documento no tiene ningun `<h2>`, devuelve una sola seccion
 * cuyo `html` es el documento entero: el modo "sin acordeon" del CA3
 * (pantalla plana).
 *
 * Se evito `htmlparser2` a proposito: su version 10+ importa
 * `entities/decode` con subpath exports y Metro no resuelve esa ruta,
 * rompiendo el bundle de Android. Como el HTML esta restringido a una
 * allowlist conocida, alcanza con un tokenizador chico basado en regex.
 */

export interface SeccionDePolitica {
  /** Titulo del h2 que abre la seccion, o '' para la seccion inicial. */
  titulo: string;
  /** HTML crudo de la seccion, sin el `<h2>` de apertura. */
  html: string;
}

interface EntidadConNombre {
  readonly nombre: string;
  readonly caracter: string;
}

/**
 * Entidades que un redactor podria escribir a mano en un documento
 * legal. Las que no estan aca quedan literales: `<RenderHtml>` las
 * decodifica igual del lado del renderer.
 */
const ENTIDADES_CON_NOMBRE: readonly EntidadConNombre[] = [
  { nombre: 'amp', caracter: '&' },
  { nombre: 'lt', caracter: '<' },
  { nombre: 'gt', caracter: '>' },
  { nombre: 'quot', caracter: '"' },
  { nombre: 'apos', caracter: "'" },
  { nombre: 'nbsp', caracter: ' ' },
  { nombre: 'copy', caracter: '©' },
  { nombre: 'reg', caracter: '®' },
  { nombre: 'trade', caracter: '™' },
  { nombre: 'mdash', caracter: '—' },
  { nombre: 'ndash', caracter: '–' },
  { nombre: 'hellip', caracter: '…' },
  { nombre: 'laquo', caracter: '«' },
  { nombre: 'raquo', caracter: '»' },
  { nombre: 'ldquo', caracter: '\u201C' },
  { nombre: 'rdquo', caracter: '\u201D' },
  { nombre: 'lsquo', caracter: '\u2018' },
  { nombre: 'rsquo', caracter: '\u2019' },
  { nombre: 'euro', caracter: '€' },
];

const MAPA_ENTIDADES = new Map<string, string>(
  ENTIDADES_CON_NOMBRE.map((entidad) => [entidad.nombre, entidad.caracter]),
);

/**
 * Decodifica las entidades HTML en una sola pasada (mismo
 * comportamiento que `htmlparser2` con `decodeEntities: true`):
 * `&amp;lt;` queda como `&lt;` y no se decodifica dos veces.
 */
function decodificarEntidades(texto: string): string {
  if (!texto.includes('&')) return texto;
  return texto.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g,
    (
      match,
      hex: string | undefined,
      dec: string | undefined,
      nombre: string | undefined,
    ): string => {
      if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
      if (dec !== undefined) return String.fromCodePoint(Number(dec));
      if (nombre !== undefined) {
        return MAPA_ENTIDADES.get(nombre) ?? match;
      }
      return match;
    },
  );
}

/**
 * Tokeniza el HTML en etiquetas y corridas de texto. Solo reconoce
 * nombres de etiqueta ASCII (suficiente para la allowlist) y descarta
 * atributos: igual que hacia `htmlparser2`, `<a href="...">` se emite
 * como `<a>`.
 */
const TOKEN = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*\/?>|[^<]+/g;

export function dividirHtmlEnSecciones(html: string): SeccionDePolitica[] {
  const secciones: SeccionDePolitica[] = [];
  let buffer = '';
  let tituloActual = '';
  let huboH2 = false;

  const flush = () => {
    if (!buffer.trim()) return;
    secciones.push({ titulo: tituloActual, html: buffer });
    buffer = '';
    tituloActual = '';
  };

  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null = TOKEN.exec(html);
  while (match !== null) {
    if (match[1] !== undefined) {
      procesarEtiqueta(
        match[1],
        match[0].startsWith('</'),
        match[0].endsWith('/>'),
      );
    } else {
      acumularTexto(decodificarEntidades(match[0]));
    }
    match = TOKEN.exec(html);
  }
  flush();

  return secciones;

  function procesarEtiqueta(
    nombreCrudo: string,
    esCierre: boolean,
    esAutocerrada: boolean,
  ): void {
    const nombre = nombreCrudo.toLowerCase();
    if (nombre === 'h2') {
      huboH2 = true;
      if (!esCierre) flush();
      return;
    }
    if (nombre === 'h3') {
      buffer += esCierre ? '</h3>' : '<h3>';
      return;
    }
    if (nombre === 'br') {
      buffer += '<br />';
      return;
    }
    if (esAutocerrada) return;
    buffer += esCierre ? `</${nombre}>` : `<${nombre}>`;
  }

  function acumularTexto(texto: string): void {
    if (secciones.length === 0 && !huboH2) {
      buffer += texto;
      return;
    }
    if (tituloActual === '' && huboH2 && buffer === '') {
      tituloActual += texto;
      return;
    }
    buffer += texto;
  }
}
