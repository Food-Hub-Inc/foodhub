import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Control de acceso del modulo de parámetros generales — mismo alcance que
 * `categorias.router.test.ts`: sin sesión, ninguna ruta atiende.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const BASE = '/api/v1/configuracion/parametros';

const rutasProtegidas = [
  ['get', BASE],
  ['patch', `${BASE}/busqueda`],
  ['post', `${BASE}/busqueda/restaurar`],
  ['patch', `${BASE}/pedidos`],
  ['post', `${BASE}/pedidos/restaurar`],
  ['patch', `${BASE}/resenas`],
  ['post', `${BASE}/resenas/restaurar`],
  ['patch', `${BASE}/institucional`],
  ['post', `${BASE}/institucional/restaurar`],
] as const;

describe('acceso al módulo de parámetros generales', () => {
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
