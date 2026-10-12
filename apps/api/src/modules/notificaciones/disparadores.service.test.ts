import { describe, expect, it } from 'vitest';
import { planDeNotificacionDeTransicion } from './disparadores.service.js';

/**
 * US-NOT-01 - A quien se notifica y con que texto cada transicion de pedido.
 * `planDeNotificacionDeTransicion` es pura: se prueba sin base.
 */

const DATOS = {
  clienteId: 'cliente-id',
  cocineroId: 'cocinero-id',
  numeroPedido: 'FH-00042',
  nombrePlato: 'Milanesa',
  cocineroNombre: 'Juan Gómez',
};

describe('planDeNotificacionDeTransicion', () => {
  it('ACEPTADO -> al cliente, con el nombre del cocinero', () => {
    const plan = planDeNotificacionDeTransicion('ACEPTADO', 'COCINERO', DATOS);
    expect(plan).toMatchObject({
      destinatario: 'cliente-id',
      tipo: 'PEDIDO_ACEPTADO',
      cuerpo:
        '¡Tu pedido fue aceptado! Juan Gómez ya está preparando tu pedido. Pedido #FH-00042.',
    });
  });

  it('LISTO -> al cliente', () => {
    const plan = planDeNotificacionDeTransicion('LISTO', 'COCINERO', DATOS);
    expect(plan).toMatchObject({
      destinatario: 'cliente-id',
      tipo: 'PEDIDO_LISTO',
    });
  });

  it('COMPLETADO -> al cliente', () => {
    const plan = planDeNotificacionDeTransicion(
      'COMPLETADO',
      'COCINERO',
      DATOS,
    );
    expect(plan).toMatchObject({
      destinatario: 'cliente-id',
      tipo: 'PEDIDO_COMPLETADO',
    });
  });

  it('RECHAZADO por el COCINERO -> al cliente ("rechazado por el cocinero")', () => {
    const plan = planDeNotificacionDeTransicion('RECHAZADO', 'COCINERO', DATOS);
    expect(plan).toMatchObject({
      destinatario: 'cliente-id',
      tipo: 'PEDIDO_RECHAZADO',
      cuerpo:
        'Tu pedido fue rechazado por el cocinero. Pedido #FH-00042. Ingresá para ver el motivo.',
    });
  });

  it('RECHAZADO por el CLIENTE (cancelación) -> al cocinero, con el plato', () => {
    const plan = planDeNotificacionDeTransicion('RECHAZADO', 'CLIENTE', DATOS);
    expect(plan).toMatchObject({
      destinatario: 'cocinero-id',
      tipo: 'PEDIDO_RECHAZADO',
      cuerpo: 'El cliente canceló su pedido. Milanesa. Pedido #FH-00042.',
    });
  });

  it('RECHAZADO por el SISTEMA (expiración) -> null: lo maneja el planificador', () => {
    expect(
      planDeNotificacionDeTransicion('RECHAZADO', 'SISTEMA', DATOS),
    ).toBeNull();
  });

  it('CREADO no dispara nada por este camino (lo hace notificarNuevoPedido)', () => {
    expect(
      planDeNotificacionDeTransicion('CREADO', 'CLIENTE', DATOS),
    ).toBeNull();
  });
});
