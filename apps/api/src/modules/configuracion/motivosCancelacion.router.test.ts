import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de motivos de cancelación — mismo alcance que
 * `categorias.router.test.ts`: sin sesión, ninguna ruta atiende.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';
const BASE = '/api/v1/configuracion/motivos-cancelacion';

const rutasProtegidas = [
  ['get', BASE],
  ['post', BASE],
  ['patch', `${BASE}/${ID_CUALQUIERA}`],
  ['post', `${BASE}/${ID_CUALQUIERA}/habilitacion`],
  ['delete', `${BASE}/${ID_CUALQUIERA}/habilitacion`],
] as const;

describe('acceso al módulo de motivos de cancelación', () => {
  it.each(rutasProtegidas)(
    '%s %s responde 401 SIN_TOKEN sin sesión',
    async (metodo, ruta) => {
      const respuesta = await request(app)[metodo](ruta).send({});

      expect(respuesta.status).toBe(401);
      const cuerpo = respuesta.body as RespuestaError;
      expect(cuerpo.error.codigo).toBe('SIN_TOKEN');
      expect(cuerpo.error.mensaje).toBe(MENSAJES_AUTH.sesionRequerida);
    },
  );
});
