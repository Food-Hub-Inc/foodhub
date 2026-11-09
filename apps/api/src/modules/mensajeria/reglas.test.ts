import { describe, expect, it } from 'vitest';
import {
  MAXIMO_CARACTERES_MENSAJE,
  MAXIMO_IMAGEN_MENSAJE_BYTES,
  MENSAJES_MENSAJERIA,
  acusarEntregaSchema,
  enviarMensajeSchema,
  filtrosConversacionesSchema,
  historialDeMensajesSchema,
  solicitarUrlDeCargaImagenChatSchema,
  type Interlocutor,
} from '@foodhub/shared';
import { aInterlocutor, type FilaConversacion } from './consultas.js';
import { mensajeDeBloqueo, motivoDeBloqueo } from './reglas.js';

/**
 * Reglas del modulo de Mensajeria que no dependen de la base.
 *
 * Cubren tres cosas: cuando una conversacion deja de admitir mensajes
 * (US-MSG-01 y US-MSG-07), que la identidad de una cuenta dada de baja no salga
 * de la API (US-MSG-07) y las validaciones de entrada que los criterios de
 * aceptacion fijan con numero exacto (US-MSG-02, US-MSG-03 y US-MSG-05).
 *
 * Lo que NO se prueba aca: las consultas. Necesitan Postgres y el entorno de
 * test apunta a un puerto cerrado a proposito (`vitest.config.ts`), igual que en
 * el resto de los modulos.
 */

function interlocutor(parcial: Partial<Interlocutor> = {}): Interlocutor {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    nombre: 'Ana',
    apellido: 'Pérez',
    fotoPerfilUrl: 'https://ejemplo.test/ana.jpg',
    esCocinero: true,
    eliminado: false,
    suspendido: false,
    ...parcial,
  };
}

function fila(parcial: Partial<FilaConversacion> = {}): FilaConversacion {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    bloqueadaPorBaja: false,
    fechaUltimoMensaje: new Date('2026-08-21T10:00:00.000Z'),
    noLeidos: 0,
    archivada: false,
    interlocutorId: '11111111-1111-4111-8111-111111111111',
    interlocutorNombre: 'Ana',
    interlocutorApellido: 'Pérez',
    interlocutorFotoPerfilUrl: 'https://ejemplo.test/ana.jpg',
    interlocutorTipo: 'COCINERO',
    interlocutorEstadoCuenta: 'ACTIVA',
    ...parcial,
  };
}

describe('motivoDeBloqueo', () => {
  it('no bloquea una conversación entre dos cuentas activas', () => {
    expect(motivoDeBloqueo(false, interlocutor())).toBeNull();
  });

  it('US-MSG-01 · bloquea por SUSPENSION si el interlocutor está suspendido', () => {
    expect(motivoDeBloqueo(false, interlocutor({ suspendido: true }))).toBe(
      'SUSPENSION',
    );
  });

  it('US-MSG-07 · bloquea por BAJA si el interlocutor eliminó su cuenta', () => {
    expect(motivoDeBloqueo(false, interlocutor({ eliminado: true }))).toBe(
      'BAJA',
    );
  });

  it('US-MSG-07 · bloquea por BAJA con el flag de la conversación, aunque la cuenta figure activa', () => {
    expect(motivoDeBloqueo(true, interlocutor())).toBe('BAJA');
  });

  it('la baja gana sobre la suspensión cuando se dan las dos', () => {
    expect(
      motivoDeBloqueo(
        true,
        interlocutor({ eliminado: true, suspendido: true }),
      ),
    ).toBe('BAJA');
  });
});

describe('mensajeDeBloqueo', () => {
  it('US-MSG-01 · usa el literal del cocinero cuando el suspendido es cocinero', () => {
    expect(mensajeDeBloqueo('SUSPENSION', interlocutor())).toBe(
      MENSAJES_MENSAJERIA.cocineroNoDisponible,
    );
  });

  it('usa la variante neutra cuando el suspendido es un cliente', () => {
    expect(
      mensajeDeBloqueo('SUSPENSION', interlocutor({ esCocinero: false })),
    ).toBe(MENSAJES_MENSAJERIA.interlocutorNoDisponible);
  });

  it('US-MSG-01 · la baja responde el mismo texto para los dos roles', () => {
    expect(mensajeDeBloqueo('BAJA', interlocutor())).toBe(
      MENSAJES_MENSAJERIA.destinatarioEliminado,
    );
    expect(mensajeDeBloqueo('BAJA', interlocutor({ esCocinero: false }))).toBe(
      MENSAJES_MENSAJERIA.destinatarioEliminado,
    );
  });
});

describe('aInterlocutor', () => {
  it('devuelve la identidad completa de una cuenta activa', () => {
    const resultado = aInterlocutor(fila());

    expect(resultado.nombre).toBe('Ana');
    expect(resultado.apellido).toBe('Pérez');
    expect(resultado.fotoPerfilUrl).toBe('https://ejemplo.test/ana.jpg');
    expect(resultado.eliminado).toBe(false);
  });

  it('US-MSG-07 · oculta nombre, apellido y foto de una cuenta dada de baja', () => {
    const resultado = aInterlocutor(
      fila({ interlocutorEstadoCuenta: 'ELIMINADA' }),
    );

    expect(resultado.nombre).toBeNull();
    expect(resultado.apellido).toBeNull();
    expect(resultado.fotoPerfilUrl).toBeNull();
    expect(resultado.eliminado).toBe(true);
  });

  it('US-MSG-01 · conserva la identidad de una cuenta suspendida', () => {
    const resultado = aInterlocutor(
      fila({ interlocutorEstadoCuenta: 'SUSPENDIDA' }),
    );

    expect(resultado.nombre).toBe('Ana');
    expect(resultado.suspendido).toBe(true);
    expect(resultado.eliminado).toBe(false);
  });
});

describe('US-MSG-02 · validación del mensaje de texto', () => {
  it('rechaza un mensaje vacío', () => {
    const resultado = enviarMensajeSchema.safeParse({
      tipo: 'TEXTO',
      contenido: '',
    });
    expect(resultado.success).toBe(false);
  });

  it('rechaza un mensaje de solo espacios en blanco', () => {
    const resultado = enviarMensajeSchema.safeParse({
      tipo: 'TEXTO',
      contenido: '      \n\t  ',
    });
    expect(resultado.success).toBe(false);
  });

  it('recorta los espacios de los extremos antes de guardar', () => {
    const resultado = enviarMensajeSchema.parse({
      tipo: 'TEXTO',
      contenido: '  hola  ',
    });
    expect(resultado).toEqual({ tipo: 'TEXTO', contenido: 'hola' });
  });

  it('admite exactamente 2000 caracteres y rechaza 2001', () => {
    const alLimite = 'a'.repeat(MAXIMO_CARACTERES_MENSAJE);
    const pasado = 'a'.repeat(MAXIMO_CARACTERES_MENSAJE + 1);

    expect(
      enviarMensajeSchema.safeParse({ tipo: 'TEXTO', contenido: alLimite })
        .success,
    ).toBe(true);
    expect(
      enviarMensajeSchema.safeParse({ tipo: 'TEXTO', contenido: pasado })
        .success,
    ).toBe(false);
  });

  it('un mensaje de texto no puede traer una imagen de contrabando', () => {
    const resultado = enviarMensajeSchema.parse({
      tipo: 'TEXTO',
      contenido: 'hola',
      imagenUrl: 'https://ejemplo.test/otra.jpg',
    });
    expect(resultado).not.toHaveProperty('imagenUrl');
  });
});

describe('US-MSG-03 · validación de la imagen', () => {
  it('admite JPG, PNG y WEBP', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
      const resultado = solicitarUrlDeCargaImagenChatSchema.safeParse({
        mimeType,
        tamano: 1024,
      });
      expect(resultado.success).toBe(true);
    }
  });

  it('rechaza un formato no admitido con el literal del criterio', () => {
    const resultado = solicitarUrlDeCargaImagenChatSchema.safeParse({
      mimeType: 'image/gif',
      tamano: 1024,
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(
      MENSAJES_MENSAJERIA.imagenInvalida,
    );
  });

  it('admite exactamente 8 MB y rechaza un byte más', () => {
    expect(
      solicitarUrlDeCargaImagenChatSchema.safeParse({
        mimeType: 'image/png',
        tamano: MAXIMO_IMAGEN_MENSAJE_BYTES,
      }).success,
    ).toBe(true);

    const pasado = solicitarUrlDeCargaImagenChatSchema.safeParse({
      mimeType: 'image/png',
      tamano: MAXIMO_IMAGEN_MENSAJE_BYTES + 1,
    });
    expect(pasado.success).toBe(false);
    expect(pasado.error?.issues[0]?.message).toBe(
      MENSAJES_MENSAJERIA.imagenInvalida,
    );
  });

  it('el pie de imagen es opcional y se recorta', () => {
    expect(
      enviarMensajeSchema.parse({
        tipo: 'IMAGEN',
        imagenUrl: 'https://ejemplo.test/foto.jpg',
      }),
    ).toEqual({ tipo: 'IMAGEN', imagenUrl: 'https://ejemplo.test/foto.jpg' });

    expect(
      enviarMensajeSchema.parse({
        tipo: 'IMAGEN',
        imagenUrl: 'https://ejemplo.test/foto.jpg',
        pieDeImagen: '  para el pedido  ',
      }),
    ).toEqual({
      tipo: 'IMAGEN',
      imagenUrl: 'https://ejemplo.test/foto.jpg',
      pieDeImagen: 'para el pedido',
    });
  });
});

describe('US-MSG-04 y US-MSG-05 · filtros y paginación', () => {
  it('el listado sin parámetros muestra las conversaciones activas', () => {
    expect(filtrosConversacionesSchema.parse({})).toEqual({
      filtro: 'ACTIVAS',
    });
  });

  it('rechaza un filtro que no sea ACTIVAS o ARCHIVADAS', () => {
    expect(
      filtrosConversacionesSchema.safeParse({ filtro: 'TODAS' }).success,
    ).toBe(false);
  });

  it('la primera carga del historial trae 50 mensajes', () => {
    expect(historialDeMensajesSchema.parse({})).toEqual({ limite: 50 });
  });

  it('no deja pedir más de 50 mensajes por bloque', () => {
    expect(historialDeMensajesSchema.safeParse({ limite: 200 }).success).toBe(
      false,
    );
  });

  it('acepta el cursor de la paginación como fecha ISO', () => {
    const resultado = historialDeMensajesSchema.parse({
      antesDe: '2026-08-21T10:00:00.000Z',
    });
    expect(resultado.antesDe).toBe('2026-08-21T10:00:00.000Z');
  });
});

describe('US-MSG-02 · acuse de entrega', () => {
  it('exige al menos un mensaje', () => {
    expect(acusarEntregaSchema.safeParse({ mensajeIds: [] }).success).toBe(
      false,
    );
  });

  it('rechaza un identificador que no sea UUID', () => {
    expect(
      acusarEntregaSchema.safeParse({ mensajeIds: ['no-es-uuid'] }).success,
    ).toBe(false);
  });

  it('acepta un lote de hasta 50 mensajes', () => {
    const ids = Array.from(
      { length: 50 },
      (_, i) =>
        `33333333-3333-4333-8333-${String(i).padStart(12, '0')}` as const,
    );
    expect(acusarEntregaSchema.safeParse({ mensajeIds: ids }).success).toBe(
      true,
    );
  });
});
