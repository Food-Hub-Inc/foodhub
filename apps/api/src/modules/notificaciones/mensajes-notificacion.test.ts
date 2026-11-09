import { describe, expect, it } from 'vitest';
import { MENSAJES_NOTIFICACION } from '@foodhub/shared';

/**
 * Textos LITERALES de las notificaciones (US-NOT-01, US-NOT-02, US-NOT-06).
 *
 * El `cuerpo` de cada notificacion esta comprometido palabra por palabra con
 * un criterio de aceptacion y lo verifica la Etapa 6. Esta prueba lo fija:
 * cualquier cambio de una tilde, un guion (— vs -) o un punto rompe aca antes
 * que en la evaluacion. `@foodhub/shared` no tiene runner propio, asi que la
 * prueba vive en la API, que es quien emite las notificaciones.
 *
 * `titulo` es [PROPIO] (solo se ve en el encabezado del push) y no se fija.
 */

const NRO = 'FH-00042';

describe('MENSAJES_NOTIFICACION · US-NOT-01 (ciclo de vida del pedido)', () => {
  it('pedido creado, al cocinero', () => {
    expect(
      MENSAJES_NOTIFICACION.pedidoCreado('Milanesa', 'Ana Pérez', NRO).cuerpo,
    ).toBe('Nuevo pedido recibido — Milanesa de Ana Pérez. Pedido #FH-00042.');
  });

  it('pedido aceptado, al cliente', () => {
    expect(MENSAJES_NOTIFICACION.pedidoAceptado('Juan Gómez', NRO).cuerpo).toBe(
      '¡Tu pedido fue aceptado! Juan Gómez ya está preparando tu pedido. Pedido #FH-00042.',
    );
  });

  it('pedido listo, al cliente', () => {
    expect(MENSAJES_NOTIFICACION.pedidoListo(NRO).cuerpo).toBe(
      '¡Tu pedido está listo! Pedido #FH-00042.',
    );
  });

  it('pedido completado, al cliente', () => {
    expect(MENSAJES_NOTIFICACION.pedidoCompletado(NRO).cuerpo).toBe(
      '¡Tu pedido fue entregado! ¿Cómo estuvo? Podés dejar tu reseña. Pedido #FH-00042.',
    );
  });

  it('pedido rechazado por el cocinero, al cliente', () => {
    expect(MENSAJES_NOTIFICACION.pedidoRechazadoPorCocinero(NRO).cuerpo).toBe(
      'Tu pedido fue rechazado por el cocinero. Pedido #FH-00042. Ingresá para ver el motivo.',
    );
  });

  it('pedido cancelado por el cliente, al cocinero', () => {
    expect(
      MENSAJES_NOTIFICACION.pedidoCanceladoPorCliente('Milanesa', NRO).cuerpo,
    ).toBe('El cliente canceló su pedido. Milanesa. Pedido #FH-00042.');
  });

  it('pedido expirado por el sistema, al cocinero', () => {
    expect(
      MENSAJES_NOTIFICACION.pedidoExpiradoParaCocinero('Milanesa', NRO).cuerpo,
    ).toBe('El pedido fue cancelado. Milanesa. Pedido #FH-00042.');
  });

  it('pedido expirado por el sistema, al cliente (guion medio, no raya)', () => {
    expect(MENSAJES_NOTIFICACION.pedidoExpiradoParaCliente(NRO).cuerpo).toBe(
      'Tu pedido expiró - el cocinero no respondió a tiempo. Pedido #FH-00042.',
    );
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-02 (mensaje nuevo)', () => {
  it('remitente y texto, sin punto final agregado', () => {
    expect(
      MENSAJES_NOTIFICACION.mensajeNuevo('Ana Pérez', 'hola!').cuerpo,
    ).toBe('Ana Pérez: hola!');
  });

  it('trunca el texto a 80 caracteres como máximo', () => {
    const largo = 'x'.repeat(200);
    const { cuerpo } = MENSAJES_NOTIFICACION.mensajeNuevo('Ana', largo);
    const extracto = cuerpo.slice('Ana: '.length);

    expect(extracto).toHaveLength(80);
    expect(extracto.endsWith('…')).toBe(true);
  });

  it('no trunca ni marca un texto que entra en 80', () => {
    expect(MENSAJES_NOTIFICACION.mensajeNuevo('Ana', 'todo bien').cuerpo).toBe(
      'Ana: todo bien',
    );
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-05 (reseña recibida)', () => {
  it('con comentario: extracto a 80 y calificación en plural', () => {
    expect(
      MENSAJES_NOTIFICACION.resenaRecibida('Ana Pérez', 5, 'Todo riquísimo')
        .cuerpo,
    ).toBe(
      'Ana Pérez dejó una reseña sobre tu pedido: Todo riquísimo. Calificación: 5 estrellas.',
    );
  });

  it('sin comentario: solo la calificación', () => {
    expect(
      MENSAJES_NOTIFICACION.resenaRecibida('Ana Pérez', 3, null).cuerpo,
    ).toBe(
      'Ana Pérez dejó una reseña sobre tu pedido. Calificación: 3 estrellas.',
    );
  });

  it('una estrella también va en plural ("[N] estrellas" del criterio)', () => {
    expect(MENSAJES_NOTIFICACION.resenaRecibida('Ana', 1, null).cuerpo).toBe(
      'Ana dejó una reseña sobre tu pedido. Calificación: 1 estrellas.',
    );
  });

  it('trunca el comentario largo a 80 caracteres como máximo', () => {
    const { cuerpo } = MENSAJES_NOTIFICACION.resenaRecibida(
      'Ana',
      4,
      'x'.repeat(200),
    );
    const extracto = cuerpo.slice(
      'Ana dejó una reseña sobre tu pedido: '.length,
      cuerpo.indexOf('. Calificación:'),
    );
    expect(extracto).toHaveLength(80);
    expect(extracto.endsWith('…')).toBe(true);
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-06 (publicación de favorito)', () => {
  it('nombre del cocinero, plato entre comillas simples y precio $AR', () => {
    expect(
      MENSAJES_NOTIFICACION.publicacionDeCocineroFavorito(
        'Juan Gómez',
        'Milanesa napolitana',
        '1500.00',
      ).cuerpo,
    ).toBe(
      "Juan Gómez publicó un nuevo plato: 'Milanesa napolitana' — $1.500,00.",
    );
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-03 (eliminación por el administrador)', () => {
  it('plato entre comillas simples y el motivo con punto final', () => {
    expect(
      MENSAJES_NOTIFICACION.publicacionEliminadaPorAdmin(
        'Empanadas',
        'La imagen no corresponde al plato',
      ).cuerpo,
    ).toBe(
      "Tu publicación 'Empanadas' fue eliminada por el administrador. La imagen no corresponde al plato.",
    );
  });

  it('no duplica el punto si el motivo ya termina con uno', () => {
    expect(
      MENSAJES_NOTIFICACION.publicacionEliminadaPorAdmin(
        'Empanadas',
        'Contenido duplicado.',
      ).cuerpo,
    ).toBe(
      "Tu publicación 'Empanadas' fue eliminada por el administrador. Contenido duplicado.",
    );
  });

  it('nunca supera los 500 caracteres de notificacion.cuerpo', () => {
    const { cuerpo } = MENSAJES_NOTIFICACION.publicacionEliminadaPorAdmin(
      'x'.repeat(80),
      'y'.repeat(500),
    );
    expect(cuerpo.length).toBe(500);
    expect(cuerpo.endsWith('…')).toBe(true);
  });
});

describe('MENSAJES_NOTIFICACION · RF086 (moderación de reseñas)', () => {
  it('a quienes reportaron, cuando se rechaza el reporte', () => {
    expect(MENSAJES_NOTIFICACION.reporteRevisado.cuerpo).toBe(
      'Revisamos tu reporte sobre una reseña y consideramos que cumple con nuestras normas de comunidad. La reseña se mantiene visible. Gracias por tu colaboración.',
    );
  });

  it('al autor, cuando se aprueba el reporte (texto aprobado por el equipo)', () => {
    expect(MENSAJES_NOTIFICACION.resenaRemovida.cuerpo).toBe(
      'Tu reseña fue removida por incumplir las normas de comunidad.',
    );
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-04 (aviso general)', () => {
  it('título y cuerpo pasan tal cual los escribió el administrador', () => {
    expect(
      MENSAJES_NOTIFICACION.avisoGeneral('Mantenimiento', 'Hoy a las 22 hs.'),
    ).toEqual({ titulo: 'Mantenimiento', cuerpo: 'Hoy a las 22 hs.' });
  });
});

describe('MENSAJES_NOTIFICACION · US-NOT-07', () => {
  it('estado vacío del historial (voseo)', () => {
    expect(MENSAJES_NOTIFICACION.historialVacio).toBe(
      'Todavía no tenés notificaciones.',
    );
  });
});
