import type {
  CapituloManualPublico,
  SeccionManualPublica,
} from '@foodhub/shared';

/**
 * Elimina etiquetas HTML y entidades comunes para buscar sobre texto plano.
 * Evita falsos positivos en atributos como `src`, `href` o nombres de tags.
 */
export function extraerTextoPlano(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae un fragmento de texto alrededor de la coincidencia del término
 * para mostrarlo como preview en los resultados de búsqueda.
 */
export function extraerSnippet(
  texto: string,
  consulta: string,
  margen = 35,
): string {
  const termino = consulta.trim().toLocaleLowerCase('es-AR');
  const normalizado = texto.toLocaleLowerCase('es-AR');
  const pos = normalizado.indexOf(termino);
  if (pos === -1) return texto.slice(0, 80);

  const inicio = Math.max(0, pos - margen);
  const fin = Math.min(texto.length, pos + termino.length + margen + 15);
  const prefijo = inicio > 0 ? '…' : '';
  const sufijo = fin < texto.length ? '…' : '';

  return `${prefijo}${texto.slice(inicio, fin).trim()}${sufijo}`;
}

export interface SeccionCoincidencia {
  readonly seccion: SeccionManualPublica;
  readonly coincideTitulo: boolean;
  readonly snippetCuerpo?: string;
}

export interface CapituloCoincidencia {
  readonly capitulo: CapituloManualPublico;
  readonly coincideTitulo: boolean;
  readonly seccionesCoincidentes: SeccionCoincidencia[];
}

/**
 * Busca capítulos y subsecciones por título y cuerpo (HTML texto plano).
 * Case-insensitive usando localización es-AR (CA3, CA4).
 */
export function buscarEnManual(
  capitulos: CapituloManualPublico[],
  consulta: string,
): CapituloCoincidencia[] {
  const termino = consulta.trim().toLocaleLowerCase('es-AR');
  if (!termino) {
    return capitulos.map((capitulo) => ({
      capitulo,
      coincideTitulo: false,
      seccionesCoincidentes: capitulo.secciones.map((seccion) => ({
        seccion,
        coincideTitulo: false,
      })),
    }));
  }

  const resultados: CapituloCoincidencia[] = [];

  for (const capitulo of capitulos) {
    const coincideTituloCap = capitulo.titulo
      .toLocaleLowerCase('es-AR')
      .includes(termino);

    const seccionesCoincidentes: SeccionCoincidencia[] = [];

    for (const seccion of capitulo.secciones) {
      const coincideTituloSec = seccion.titulo
        .toLocaleLowerCase('es-AR')
        .includes(termino);

      const textoPlano = extraerTextoPlano(seccion.contenidoHtml);
      const coincideCuerpo = textoPlano
        .toLocaleLowerCase('es-AR')
        .includes(termino);

      if (coincideTituloSec || coincideCuerpo) {
        seccionesCoincidentes.push({
          seccion,
          coincideTitulo: coincideTituloSec,
          snippetCuerpo:
            !coincideTituloSec && coincideCuerpo
              ? extraerSnippet(textoPlano, consulta)
              : undefined,
        });
      }
    }

    if (coincideTituloCap || seccionesCoincidentes.length > 0) {
      resultados.push({
        capitulo,
        coincideTitulo: coincideTituloCap,
        seccionesCoincidentes,
      });
    }
  }

  return resultados;
}
