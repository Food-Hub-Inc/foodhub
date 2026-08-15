import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { MENSAJES_AUTH, MENSAJES_VALIDACION } from '@foodhub/shared';
import { crearApp } from '../../app.js';

/**
 * Criterios de aceptacion de US-AUT-01, US-AUT-02 y US-AUT-04 que se pueden
 * verificar sin base de datos: todo lo que el servidor rechaza ANTES de tocar
 * Supabase.
 *
 * Los literales se comparan contra `@foodhub/shared` y no contra una constante
 * local: el objetivo es detectar que alguien cambie el texto del criterio de
 * aceptacion, no que la prueba y el codigo se copien el mismo error.
 */
const app = crearApp();

interface CampoInvalido {
  campo: string;
  mensaje: string;
}

interface RespuestaError {
  error: { codigo: string; mensaje: string; campos?: CampoInvalido[] };
}

function mensajeDe(cuerpo: RespuestaError, campo: string): string | undefined {
  return cuerpo.error.campos?.find((c) => c.campo === campo)?.mensaje;
}

const clienteValido = {
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ana@example.com',
  password: 'Contrasena1',
  confirmPassword: 'Contrasena1',
  terminosAceptados: true,
};

describe('POST /api/v1/auth/registro/cliente', () => {
  it('rechaza contraseñas que no coinciden con el literal de US-AUT-01', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cliente')
      .send({ ...clienteValido, confirmPassword: 'Otra1234' });

    expect(respuesta.status).toBe(400);
    const cuerpo = respuesta.body as RespuestaError;
    expect(cuerpo.error.codigo).toBe('VALIDACION');
    expect(mensajeDe(cuerpo, 'confirmPassword')).toBe(
      MENSAJES_AUTH.contrasenasNoCoinciden,
    );
  });

  it('exige la longitud mínima de contraseña de US-AUT-01', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cliente')
      .send({ ...clienteValido, password: 'Ab1', confirmPassword: 'Ab1' });

    expect(respuesta.status).toBe(400);
    expect(mensajeDe(respuesta.body as RespuestaError, 'password')).toBe(
      MENSAJES_VALIDACION.contrasenaCorta,
    );
  });

  it('exige la aceptación de los términos', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cliente')
      .send({ ...clienteValido, terminosAceptados: false });

    expect(respuesta.status).toBe(400);
    expect(
      mensajeDe(respuesta.body as RespuestaError, 'terminosAceptados'),
    ).toBe(MENSAJES_VALIDACION.terminosSinAceptar);
  });

  it('rechaza un correo mal formado', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cliente')
      .send({ ...clienteValido, email: 'ana-arroba-example' });

    expect(respuesta.status).toBe(400);
    expect(mensajeDe(respuesta.body as RespuestaError, 'email')).toBe(
      MENSAJES_VALIDACION.correoInvalido,
    );
  });

  it('no acepta un cuerpo vacío', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cliente')
      .send({});

    expect(respuesta.status).toBe(400);
    expect((respuesta.body as RespuestaError).error.codigo).toBe('VALIDACION');
  });
});

describe('POST /api/v1/auth/registro/cocinero', () => {
  const cocineroValido = {
    ...clienteValido,
    email: 'coci@example.com',
    ubicacion: { lat: -32.89, lng: -68.84 },
  };

  it('exige la ubicación, obligatoria en US-AUT-02', async () => {
    const { ubicacion: _ubicacion, ...sinUbicacion } = cocineroValido;
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cocinero')
      .send(sinUbicacion);

    expect(respuesta.status).toBe(400);
    expect(mensajeDe(respuesta.body as RespuestaError, 'ubicacion')).toBe(
      'Seleccioná tu ubicación en el mapa.',
    );
  });

  it('rechaza coordenadas fuera de rango', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/registro/cocinero')
      .send({ ...cocineroValido, ubicacion: { lat: -32.89, lng: -1000 } });

    expect(respuesta.status).toBe(400);
    expect(mensajeDe(respuesta.body as RespuestaError, 'ubicacion.lng')).toBe(
      'La longitud debe estar entre -180 y 180.',
    );
  });
});

describe('POST /api/v1/auth/recuperacion', () => {
  it('rechaza un correo mal formado antes de consultar la base', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/recuperacion')
      .send({ email: 'no-es-un-correo' });

    expect(respuesta.status).toBe(400);
    expect(mensajeDe(respuesta.body as RespuestaError, 'email')).toBe(
      MENSAJES_VALIDACION.correoInvalido,
    );
  });
});

describe('rutas que no existen', () => {
  it('no expone un endpoint de login: lo resuelve el SDK de Supabase', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@example.com', password: 'Contrasena1' });

    expect(respuesta.status).toBe(404);
    expect((respuesta.body as RespuestaError).error.codigo).toBe(
      'RUTA_NO_ENCONTRADA',
    );
  });
});
