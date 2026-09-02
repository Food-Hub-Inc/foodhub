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

describe('MENSAJES_NOTIFICACION · US-NOT-07', () => {
  it('estado vacío del historial (voseo)', () => {
    expect(MENSAJES_NOTIFICACION.historialVacio).toBe(
      'Todavía no tenés notificaciones.',
    );
  });
});
