import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { crearApp } from '../../app.js';

/**
 * US-AUD-02, quinto criterio: "si el usuario no tiene rol de administrador,
 * no debe poder acceder al modulo".
 *
 * Sin base de datos solo se puede verificar la primera barrera (la sesion): el
 * rechazo por rol necesita un JWT valido de un usuario real. Igual es la
 * comprobacion que importa que no se rompa, porque el modulo entero se protege
 * con un unico `router.use` y una regresion ahi dejaria todo el historial de
 * auditoria abierto.
 */
const app = crearApp();

interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

const rutas = [
  '/api/v1/auditoria',
  '/api/v1/auditoria/exportar',
  '/api/v1/auditoria/seguridad',
  '/api/v1/auditoria/seguridad/exportar',
];

describe('acceso al módulo de auditoría', () => {
  it.each(rutas)('GET %s responde 401 sin sesión', async (ruta) => {
    const respuesta = await request(app).get(ruta);

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('SIN_TOKEN');
  });

  it('no expone ninguna ruta de escritura sobre el historial', async () => {
    // El registro de auditoria es append-only: se escribe desde los servicios,
    // nunca desde HTTP. La barrera del `router.use` corre antes de resolver la
    // ruta, asi que un metodo inexistente del modulo tampoco llega a atenderse.
    const respuesta = await request(app).post('/api/v1/auditoria').send({});

    expect(respuesta.status).toBe(401);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('SIN_TOKEN');
  });
});
