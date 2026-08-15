import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { MENSAJES_AUTH, MENSAJES_USUARIO } from '@foodhub/shared';
import { AppError } from './error.middleware.js';

/**
 * US-AUD-01, segundo criterio: "un usuario intenta acceder a una funcionalidad
 * sin permisos suficientes -> registre el intento de acceso indicando usuario,
 * fecha, hora y recurso solicitado".
 *
 * La base se reemplaza por un doble porque lo que se verifica es la decision
 * del middleware, no el SQL: que rechace con el codigo correcto y que deje
 * constancia del intento con los cuatro datos que exige el criterio.
 */
const { valoresInsertados } = vi.hoisted(() => ({
  valoresInsertados: vi.fn(),
}));

vi.mock('../lib/db.js', () => ({
  db: { insert: vi.fn(() => ({ values: valoresInsertados })) },
}));

const { requiereRol, soloAdministrador } = await import('./rbac.middleware.js');

interface EventoRegistrado {
  tipoEvento: string;
  usuarioId: string | null;
  emailIntentado: string | null;
  recursoSolicitado: string;
  ipOrigen: string | null;
  motivo: string;
}

function crearRequest(usuario?: {
  id: string;
  email: string;
  tipo: 'CLIENTE' | 'COCINERO' | 'ADMINISTRADOR';
  estadoCuenta: string;
}): Request {
  return {
    usuario,
    method: 'GET',
    originalUrl: '/api/v1/auditoria',
    ip: '190.192.0.7',
    socket: { remoteAddress: '190.192.0.7' },
  } as unknown as Request;
}

const cliente = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'cliente@example.com',
  tipo: 'CLIENTE' as const,
  estadoCuenta: 'ACTIVA',
};

const administrador = { ...cliente, tipo: 'ADMINISTRADOR' as const };

describe('requiereRol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    valoresInsertados.mockResolvedValue(undefined);
  });

  it('deja pasar al rol habilitado sin registrar nada', () => {
    const next = vi.fn();
    soloAdministrador(crearRequest(administrador), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(valoresInsertados).not.toHaveBeenCalled();
  });

  it('rechaza con 403 ROL_INSUFICIENTE al rol que no corresponde', () => {
    const next = vi.fn();
    soloAdministrador(crearRequest(cliente), {} as Response, next);

    const error = next.mock.calls[0]?.[0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(403);
    expect(error.codigo).toBe('ROL_INSUFICIENTE');
    expect(error.message).toBe(MENSAJES_USUARIO.accesoNoAutorizado);
  });

  it('deja constancia del intento denegado en evento_seguridad', async () => {
    soloAdministrador(crearRequest(cliente), {} as Response, vi.fn());

    // El registro es "fire and forget": la respuesta ya salió, la escritura se
    // resuelve en el siguiente turno del event loop.
    await vi.waitFor(() => {
      expect(valoresInsertados).toHaveBeenCalledTimes(1);
    });

    const evento = valoresInsertados.mock.calls[0]?.[0] as EventoRegistrado;
    expect(evento.tipoEvento).toBe('ACCESO_DENEGADO');
    expect(evento.usuarioId).toBe(cliente.id);
    expect(evento.recursoSolicitado).toBe('GET /api/v1/auditoria');
    expect(evento.ipOrigen).toBe('190.192.0.7');
    expect(evento.motivo).toContain('ADMINISTRADOR');
  });

  it('responde 401 y no 403 cuando directamente no hay sesión', () => {
    const next = vi.fn();
    requiereRol('ADMINISTRADOR')(crearRequest(), {} as Response, next);

    const error = next.mock.calls[0]?.[0] as AppError;
    expect(error.status).toBe(401);
    expect(error.codigo).toBe('SIN_SESION');
    expect(error.message).toBe(MENSAJES_AUTH.sesionRequerida);
  });

  it('no convierte un fallo de la auditoría en un fallo de la respuesta', async () => {
    valoresInsertados.mockRejectedValue(new Error('base caída'));
    const next = vi.fn();

    soloAdministrador(crearRequest(cliente), {} as Response, next);

    const error = next.mock.calls[0]?.[0] as AppError;
    expect(error.status).toBe(403);
    await vi.waitFor(() => {
      expect(valoresInsertados).toHaveBeenCalled();
    });
  });
});
