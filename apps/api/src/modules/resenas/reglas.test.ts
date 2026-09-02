import { describe, expect, it } from 'vitest';
import {
  contieneTerminoModerado,
  dentroDelPlazoParaResenar,
  HORAS_VENTANA_EDICION_RESENA,
  limiteDeEdicionResena,
  MENSAJES_RESENA,
  ventanaDeEdicionAbierta,
} from '@foodhub/shared';
import { aAutor, aResenaPublica, type FilaResena } from './consultas.js';

/**
 * Reglas del modulo de Resenas que se pueden probar SIN base de datos.
 *
 * Son las cuatro decisiones donde un error no rompe nada visible y por eso hay
 * que fijarlas con pruebas: los dos plazos —que se confunden entre si—, el
 * filtro de moderacion y las dos identidades que el listado sustituye (el autor
 * dado de baja y el plato retirado del catalogo).
 *
 * Mismo criterio que `pedidos/reglas.test.ts`: la logica de negocio vive en
 * funciones puras justamente para poder verificarla asi.
 */

const HORA = 3_600_000;
const DIA = 24 * HORA;

describe('limiteDeEdicionResena', () => {
  it('cuenta 48 horas desde la publicación cuando no hubo pedidos posteriores', () => {
    const fechaPublicacion = new Date('2026-08-01T10:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado: null,
    });

    expect(limite.getTime()).toBe(
      fechaPublicacion.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });

  /**
   * El corazon de RF080: "cada nuevo pedido completado que incluya la misma
   * publicacion reabre la ventana, contando 48 horas desde la fecha de
   * completado de ese pedido".
   */
  it('reabre la ventana desde el último pedido completado si es posterior', () => {
    const fechaPublicacion = new Date('2026-08-01T10:00:00Z');
    const ultimoPedidoCompletado = new Date('2026-08-20T15:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado,
    });

    expect(limite.getTime()).toBe(
      ultimoPedidoCompletado.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });

  /**
   * Un pedido completado ANTES de la reseña es el caso normal: el cliente pide,
   * le entregan y después reseña. No puede acortar la ventana.
   */
  it('ignora un pedido completado anterior a la publicación', () => {
    const fechaPublicacion = new Date('2026-08-10T10:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado: new Date('2026-08-09T10:00:00Z'),
    });

    expect(limite.getTime()).toBe(
      fechaPublicacion.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });
});

describe('ventanaDeEdicionAbierta', () => {
  const fechaPublicacion = new Date('2026-08-01T10:00:00Z');
  const entrada = { fechaPublicacion, ultimoPedidoCompletado: null };

  it('está abierta justo antes de cumplirse las 48 horas', () => {
    const ahora = new Date(fechaPublicacion.getTime() + 48 * HORA - 1);
    expect(ventanaDeEdicionAbierta(entrada, ahora)).toBe(true);
  });

  it('se cierra exactamente al cumplirse las 48 horas', () => {
    const ahora = new Date(fechaPublicacion.getTime() + 48 * HORA);
    expect(ventanaDeEdicionAbierta(entrada, ahora)).toBe(false);
  });
});

describe('dentroDelPlazoParaResenar', () => {
  const ultimoPedidoCompletado = new Date('2026-08-01T10:00:00Z');

  it('admite crear la reseña dentro de los días configurados', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 13 * DIA);
    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(true);
  });

  it('rechaza al cumplirse el plazo', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 14 * DIA);
    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(false);
  });

  /**
   * LOS DOS PLAZOS SON INDEPENDIENTES y esta prueba lo fija: a los 20 días del
   * pedido ya no se puede CREAR, pero una reseña publicada el día 19 sigue
   * siendo editable porque su ventana de 48 horas corre por separado.
   */
  it('el plazo de creación vencido no cierra la ventana de edición', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 20 * DIA);
    const fechaPublicacion = new Date(
      ultimoPedidoCompletado.getTime() + 19 * DIA,
    );

    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(false);
    expect(
      ventanaDeEdicionAbierta(
        { fechaPublicacion, ultimoPedidoCompletado: null },
        ahora,
      ),
    ).toBe(true);
  });
});

describe('contieneTerminoModerado', () => {
  /** El comportamiento por defecto: sin lista cargada el filtro es transparente. */
  it('no bloquea nada con la lista vacía', () => {
    expect(contieneTerminoModerado('cualquier cosa', [])).toBe(false);
  });

  it('detecta el término sin importar mayúsculas ni tildes', () => {
    expect(contieneTerminoModerado('Qué ASCO de comida', ['asco'])).toBe(true);
    expect(contieneTerminoModerado('un ásco tremendo', ['asco'])).toBe(true);
  });

  it('detecta el término aunque esté dentro de una palabra', () => {
    expect(contieneTerminoModerado('reasqueroso', ['asqueroso'])).toBe(true);
  });

  it('no marca un comentario limpio', () => {
    expect(
      contieneTerminoModerado('Muy rico, volvería a pedirlo', ['asco']),
    ).toBe(false);
  });

  it('ignora términos vacíos de la lista', () => {
    expect(contieneTerminoModerado('texto cualquiera', ['', '   '])).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Identidades sustituidas en el listado (US-RES-03, US-RES-04)
// ---------------------------------------------------------------------------

function filaDeEjemplo(cambios: Partial<FilaResena> = {}): FilaResena {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    publicacionId: 'a1b2c3d4-0000-4000-8000-000000000002',
    calificacion: 5,
    comentario: 'Excelente',
    tags: ['Sabor excelente'],
    fotoUrl: null,
    editada: false,
    fechaPublicacion: new Date('2026-08-01T10:00:00Z'),
    nombrePlato: 'Milanesa napolitana',
    publicacionActiva: true,
    autorId: 'a1b2c3d4-0000-4000-8000-000000000003',
    autorNombre: 'Ana',
    autorApellido: 'García',
    autorFotoPerfilUrl: null,
    autorEstadoCuenta: 'ACTIVA',
    ...cambios,
  };
}

describe('aAutor', () => {
  it('devuelve la identidad real de una cuenta activa', () => {
    expect(aAutor(filaDeEjemplo())).toEqual({
      id: 'a1b2c3d4-0000-4000-8000-000000000003',
      nombre: 'Ana García',
      fotoPerfilUrl: null,
    });
  });

  /**
   * US-RES-04: "muestre el autor como 'Usuario eliminado'". La baja es lógica y
   * la reseña sigue contando para el promedio; lo único que desaparece es quién
   * la escribió, incluida la foto y el id.
   */
  it('anonimiza al autor cuando la cuenta fue dada de baja', () => {
    const autor = aAutor(
      filaDeEjemplo({
        autorEstadoCuenta: 'ELIMINADA',
        autorFotoPerfilUrl: 'https://ejemplo/foto.jpg',
      }),
    );

    expect(autor).toEqual({
      id: null,
      nombre: 'Usuario eliminado',
      fotoPerfilUrl: null,
    });
  });
});

describe('aResenaPublica', () => {
  it('muestra el nombre del plato y habilita el enlace si la publicación está activa', () => {
    const publica = aResenaPublica(filaDeEjemplo());

    expect(publica.nombrePlato).toBe('Milanesa napolitana');
    expect(publica.enlaceAlPlatoHabilitado).toBe(true);
  });

  /**
   * US-RES-03: la reseña de un plato dado de baja permanece visible con
   * "[Plato no disponible]" y el enlace deshabilitado, "preservando la
   * integridad de la reputación construida".
   */
  it('sustituye el nombre y deshabilita el enlace si la publicación fue dada de baja', () => {
    const publica = aResenaPublica(filaDeEjemplo({ publicacionActiva: false }));

    expect(publica.nombrePlato).toBe(MENSAJES_RESENA.platoNoDisponible);
    expect(publica.enlaceAlPlatoHabilitado).toBe(false);
  });

  it('normaliza los tags ausentes a una lista vacía', () => {
    expect(aResenaPublica(filaDeEjemplo({ tags: null })).tags).toEqual([]);
  });
});
