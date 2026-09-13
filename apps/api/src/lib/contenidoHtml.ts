import sanitizeHtml from 'sanitize-html';

/**
 * Saneamiento del HTML del contenido de ayuda (US-AYU-05).
 *
 * El manual y las FAQ los redacta un administrador y los ve toda la
 * plataforma: no se confia ciegamente en el HTML del editor enriquecido. Se
 * permiten las etiquetas de formato habituales y las imagenes ilustrativas que
 * el manual referencia desde Supabase Storage.
 */
const OPCIONES_SANITIZACION: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
  },
  // Un enlace cargado por el administrador se abre en pestaña nueva y sin
  // referrer: lo va a abrir cualquier usuario de la plataforma.
  transformTags: {
    a: (etiqueta, atributos) => ({
      tagName: etiqueta,
      attribs: { ...atributos, rel: 'noopener noreferrer', target: '_blank' },
    }),
  },
};

export function sanitizarContenidoAyuda(html: string): string {
  return sanitizeHtml(html, OPCIONES_SANITIZACION);
}
