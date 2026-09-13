import { describe, expect, it } from 'vitest';
import { sanitizarContenidoAyuda } from './contenidoHtml.js';

/**
 * US-AYU-05 - El contenido de ayuda lo redacta un administrador y lo ve toda
 * la plataforma: el saneamiento es la frontera que impide guardar HTML
 * ejecutable.
 */
describe('sanitizarContenidoAyuda', () => {
  it('elimina los scripts y conserva el formato permitido', () => {
    const limpio = sanitizarContenidoAyuda(
      '<p>Hola <strong>mundo</strong></p><script>alert(1)</script>',
    );

    expect(limpio).not.toContain('<script');
    expect(limpio).toContain('<strong>mundo</strong>');
  });

  it('conserva las imágenes ilustrativas del manual', () => {
    const limpio = sanitizarContenidoAyuda(
      '<img src="https://cdn.foodhub.test/manual/paso.png" alt="Paso 1">',
    );

    expect(limpio).toContain('src="https://cdn.foodhub.test/manual/paso.png"');
    expect(limpio).toContain('alt="Paso 1"');
  });

  it('abre los enlaces en pestaña nueva y sin referrer', () => {
    const limpio = sanitizarContenidoAyuda(
      '<a href="https://foodhub.test">Sitio</a>',
    );

    expect(limpio).toContain('rel="noopener noreferrer"');
    expect(limpio).toContain('target="_blank"');
    expect(limpio).toContain('href="https://foodhub.test"');
  });
});
