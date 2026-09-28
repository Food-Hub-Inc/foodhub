import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH } from '@foodhub/shared';
import { crearApp } from '../../app.js';
import { resenasRouter } from './resenas.router.js';

/**
 * Control de acceso del modulo de Resenas.
 *
 * Verifica lo unico que se puede comprobar sin base ni Supabase: que ninguna
 * ruta atienda sin sesion, y que las tres rutas que exponen resenas de un
 * cliente exijan ademas el rol COCINERO. Las reglas de negocio de cada
 * endpoint -los dos plazos, el filtro de moderacion, la unicidad- se prueban
 * en `reglas.test.ts` y con usuarios reales contra foodhub-dev en la Etapa 6.
 *
 * LA SEGUNDA MITAD DE ESTE ARCHIVO ES NUEVA Y CUBRE UN RIESGO NUEVO. Hasta la
 * migracion 0015 las resenas a un cliente vivian en su propia tabla, asi que
 * era imposible que una consulta de resenas publicas las devolviera por
 * descuido. Ahora comparten tabla con las otras dos y lo unico que las protege
 * es el `requiereRol('COCINERO')` de sus rutas: US-RES-02 dice que "no es
 * visible para el cliente calificado ni para otros clientes", asi que una ruta
 * que se cuele filtraria la reputacion privada de cualquiera a cualquiera.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const ID_CUALQUIERA = '3f6d1a3e-0e2a-4f5f-9f2b-2c1d5e6a7b8c';

const rutasProtegidas = [
  ['post', '/api/v1/resenas'],
  ['patch', `/api/v1/resenas/${ID_CUALQUIERA}`],
  ['get', '/api/v1/resenas/estado'],
  ['get', `/api/v1/resenas/publicaciones/${ID_CUALQUIERA}`],
  ['get', `/api/v1/resenas/cocineros/${ID_CUALQUIERA}/opiniones`],
  ['get', `/api/v1/resenas/cocineros/${ID_CUALQUIERA}/platos`],
  ['get', `/api/v1/resenas/cocineros/${ID_CUALQUIERA}/mi-resena`],
  ['get', `/api/v1/resenas/clientes/${ID_CUALQUIERA}`],
  ['get', `/api/v1/resenas/clientes/${ID_CUALQUIERA}/perfil`],
  ['get', `/api/v1/resenas/clientes/${ID_CUALQUIERA}/reputacion`],
] as const;

describe('acceso al módulo de reseñas', () => {
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

  it('rechaza un token que no verifica contra el JWKS', async () => {
    const respuesta = await request(app)
      .get(`/api/v1/resenas/cocineros/${ID_CUALQUIERA}/opiniones`)
      .set('Authorization', 'Bearer token-fabricado');

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'TOKEN_INVALIDO',
    );
  });

  /**
   * Las rutas que se retiraron con el cambio de modelo (US-RES-07).
   *
   * SE VERIFICA QUE YA NO EXISTAN, y no es una prueba de mas: `/cocineros/:id`
   * devolvia las resenas de los PLATOS de un cocinero y ahora ese listado vive
   * en `/cocineros/:id/platos`. Si el path volviera a atender -por un `:id`
   * demasiado goloso, por ejemplo- un bundle viejo recibiria otra lista sin
   * ningun error, que es exactamente lo que se quiso evitar retirandolo.
   */
  it.each([
    '/pedidos/:pedidoId/calificacion',
    '/calificaciones/:id',
    '/cocineros/:cocineroId/reputacion',
    '/cocineros/:cocineroId',
  ])('%s ya no está registrada', (path) => {
    const capas = resenasRouter.stack as unknown as {
      route?: { path: string };
    }[];
    expect(capas.some((c) => c.route?.path === path)).toBe(false);
  });
});

/**
 * US-RES-02 - Solo un COCINERO puede ver las resenas de un cliente.
 *
 * Se inspecciona la pila de middlewares del router en lugar de emitir un token
 * de cada rol: `requiereAutenticacion` verifica contra el JWKS de Supabase y
 * firmar un token valido en una prueba unitaria obligaria a levantar la
 * infraestructura entera. Lo que hay que garantizar es una propiedad
 * ESTRUCTURAL -que estas rutas nunca queden sin la guarda de rol-, y eso la
 * pila lo dice con certeza.
 *
 * El caso con usuarios reales de los dos roles queda para la Etapa 6.
 */
describe('privacidad de las reseñas a un cliente', () => {
  /**
   * Los middlewares que Express registro para un path del router.
   *
   * `IRoute` no expone `methods` en sus tipos, asi que la pila se recorre con
   * una forma minima declarada aca: es introspeccion de Express y no parte de
   * su contrato publico.
   */
  interface CapaDeRuta {
    route?: { path: string; stack: { name: string }[] };
  }

  function guardasDe(path: string): string[] {
    const capas = resenasRouter.stack as unknown as CapaDeRuta[];
    const capa = capas.find((c) => c.route?.path === path);
    if (!capa?.route) throw new Error(`no existe la ruta ${path}`);
    return capa.route.stack.map((m) => m.name);
  }

  it.each([
    '/clientes/:clienteId',
    '/clientes/:clienteId/perfil',
    '/clientes/:clienteId/reputacion',
  ])('%s exige el rol COCINERO', (path) => {
    expect(guardasDe(path)).toContain('verificarRol');
  });

  /**
   * El contraste: las resenas de un plato y las de un cocinero SI son
   * publicas para cualquiera con sesion (US-RES-03 no acota el rol, y un
   * cocinero mirando el perfil de otro es un caso legitimo). Si alguna
   * ganara la guarda de rol, dejaria de cumplir su criterio.
   */
  it.each([
    '/publicaciones/:publicacionId',
    '/cocineros/:cocineroId/opiniones',
    '/cocineros/:cocineroId/platos',
  ])('%s queda abierta a los dos roles', (path) => {
    expect(guardasDe(path)).not.toContain('verificarRol');
  });
});
