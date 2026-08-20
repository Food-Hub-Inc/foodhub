import { Parser } from 'htmlparser2';

/**
 * Agrupa un documento legal (HTML sanitizado) en secciones delimitadas
 * por `<h2>`, para que PAN-AYU-04 muestre la politica de privacidad como
 * acordeon (CA3).
 *
 * El HTML que llega aca viene sanitizado del backend
 * (`apps/api/src/modules/configuracion/terminos.service.ts`) y solo
 * contiene la allowlist conocida: p, br, strong, em, u, ul, ol, li,
 * h1, h2, h3, a. Esta funcion hace una sola pasada con htmlparser2 y
 * devuelve una lista plana de secciones. Cada seccion arranca en un
 * `<h2>` y se extiende hasta el siguiente `<h2>` (o hasta el final).
 *
 * El texto previo al primer `<h2>` (si lo hay) se devuelve como una
 * seccion "inicial" con `titulo = ''`: asi una politica que arranque
 * con un parrafo de introduccion se ve igual que una que arranque con
 * la primera seccion.
 *
 * Si el documento no tiene ningun `<h2>`, devuelve una sola seccion
 * cuyo `html` es el documento entero: el modo "sin acordeon" del CA3
 * (pantalla plana).
 */

export interface SeccionDePolitica {
  /** Titulo del h2 que abre la seccion, o '' para la seccion inicial. */
  titulo: string;
  /** HTML crudo de la seccion, sin el `<h2>` de apertura. */
  html: string;
}

export function dividirHtmlEnSecciones(html: string): SeccionDePolitica[] {
  const secciones: SeccionDePolitica[] = [];
  let buffer = '';
  let tituloActual = '';
  let huboH2 = false;

  const flushSeccion = () => {
    if (!buffer.trim()) return;
    secciones.push({ titulo: tituloActual, html: buffer });
    buffer = '';
    tituloActual = '';
  };

  const parser = new Parser(
    {
      onopentag(name) {
        if (name === 'h2') {
          huboH2 = true;
          flushSeccion();
          // El titulo se ira llenando con ontext hasta el onclosetag del h2.
          return;
        }
        if (name === 'h3') {
          // Sub-seccion: la metemos dentro de la seccion actual con su tag
          // intacto. La primitiva de acordeon solo necesita partir por h2.
          buffer += '<h3>';
          return;
        }
        if (name === 'br') {
          buffer += '<br />';
          return;
        }
        // Para el resto de tags permitidos (p, ul, ol, li, strong, em, u, a)
        // emitimos el nombre sin atributos: la sanitizacion server-side ya
        // los valido y solo pasaron href/target/rel en <a>, que @native-html
        // ignora con seguridad si los re-escribimos como simples.
        buffer += `<${name}>`;
      },
      ontext(texto) {
        if (secciones.length === 0 && !huboH2) {
          // Estamos dentro de la seccion inicial: acumular como html.
          buffer += texto;
          return;
        }
        if (tituloActual === '' && huboH2 && buffer === '') {
          // Estamos dentro de un h2 que recien abrio.
          tituloActual += texto;
        } else {
          buffer += texto;
        }
      },
      onclosetag(name) {
        if (name === 'h2') {
          // El titulo ya se lleno con ontext: emitimos la seccion vacia
          // para que el siguiente contenido arranque una nueva.
          huboH2 = true;
          return;
        }
        if (name === 'h3') {
          buffer += '</h3>';
          return;
        }
        buffer += `</${name}>`;
      },
    },
    { decodeEntities: true },
  );

  parser.write(html);
  parser.end();
  flushSeccion();

  return secciones;
}
