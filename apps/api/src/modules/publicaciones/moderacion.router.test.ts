import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso de la moderación de publicaciones (US-ADM-04). Sin
 * sesión ninguna ruta atiende; el 403 por rol lo cubre
 * `rbac.middleware.test.ts`, que es el mismo `soloAdministrador` de acá.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';
const BASE = '/api/v1/moderacion/publicaciones';

const rutasProtegidas = [
  ['get', BASE],
  ['get', `${BASE}/${ID_CUALQUIERA}`],
  ['delete', `${BASE}/${ID_CUALQUIERA}`],
] as const;

describe('acceso a la moderación de publicaciones', () => {
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
