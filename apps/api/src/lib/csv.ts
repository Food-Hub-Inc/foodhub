/**
 * Serializacion a CSV segun RFC 4180.
 *
 * Existe como utilidad generica y no dentro del modulo de auditoria porque el
 * problema que resuelve (escapar comillas y separadores) no tiene nada que ver
 * con el dominio: cualquier exportacion futura del panel lo necesita igual.
 */

/** Columna de la exportacion: como se titula y de donde sale el valor. */
export interface ColumnaCsv<T> {
  encabezado: string;
  valor: (fila: T) => unknown;
}

const SEPARADOR = ',';

/** RFC 4180 fija CRLF como fin de linea. Excel y LibreOffice asumen eso. */
const FIN_DE_LINEA = '\r\n';

/**
 * Marca de orden de bytes UTF-8.
 *
 * Excel en Windows interpreta un CSV sin BOM con la codificacion ANSI del
 * sistema y rompe todas las tildes y enies del contenido ("auditoria" con
 * tilde queda ilegible). Tres bytes al principio evitan ese reporte de bug.
 *
 * Se construye por codigo de caracter y no como literal: un BOM suelto en el
 * fuente es invisible en el editor y ESLint lo reporta como espacio en blanco
 * irregular.
 */
export const BOM_UTF8 = String.fromCharCode(0xfeff);

/** Caracteres que obligan a encomillar el campo. */
const REQUIERE_COMILLAS = /["\r\n]|,/;

/**
 * Caracteres con los que Excel, LibreOffice y Google Sheets empiezan a
 * interpretar la celda como formula en vez de como texto.
 */
const INICIO_DE_FORMULA = /^[=+\-@]/;

function aTexto(valor: unknown): string {
  if (valor == null) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }
  // `datos_adicionales` es jsonb de estructura libre: viaja serializado en una
  // sola columna, que es lo unico que un CSV plano puede representar.
  return JSON.stringify(valor) ?? '';
}

/**
 * Neutraliza la inyeccion de formulas (CSV injection).
 *
 * El CSV de auditoria contiene texto libre escrito por usuarios: el `motivo` de
 * una suspension, el correo intentado de un login fallido. Si ese texto empieza
 * con `=`, `+`, `-` o `@`, la planilla lo evalua al abrir el archivo, y hay
 * formulas que leen otras celdas o disparan una descarga. El apostrofo inicial
 * es la convencion que las planillas entienden como "esto es texto"; se muestra
 * la celda sin el.
 *
 * Se aplica SOLO al texto libre. Un numero negativo tambien empieza con `-` y
 * prefijarlo lo volveria ilegible sin ganar nada: no viene de una persona.
 */
function neutralizarFormula(texto: string): string {
  return INICIO_DE_FORMULA.test(texto) ? `'${texto}` : texto;
}

/**
 * Escapa un campo. Un valor con comillas, separador o salto de linea se
 * encomilla y sus comillas internas se duplican; sin esto, un motivo de
 * suspension con una coma correria todas las columnas siguientes.
 *
 * El orden importa: primero se neutraliza la formula y despues se decide el
 * encomillado, de modo que el apostrofo quede DENTRO de las comillas y no las
 * anteceda, que es como lo espera RFC 4180.
 */
function escapar(valor: unknown): string {
  const bruto = aTexto(valor);
  const texto = typeof valor === 'string' ? neutralizarFormula(bruto) : bruto;
  if (!REQUIERE_COMILLAS.test(texto)) return texto;
  return `"${texto.replaceAll('"', '""')}"`;
}

export function generarCsv<T>(columnas: ColumnaCsv<T>[], filas: T[]): string {
  const encabezado = columnas.map((c) => escapar(c.encabezado)).join(SEPARADOR);
  const cuerpo = filas.map((fila) =>
    columnas.map((c) => escapar(c.valor(fila))).join(SEPARADOR),
  );
  return BOM_UTF8 + [encabezado, ...cuerpo].join(FIN_DE_LINEA) + FIN_DE_LINEA;
}
