import { describe, expect, it } from 'vitest';
import {
  contieneTerminoModerado,
  dentroDelPlazoParaResenar,
  HORAS_VENTANA_EDICION_RESENA,
  limiteDeEdicionResena,
  MENSAJES_RESENA,
  ventanaDeEdicionAbierta,
} from '@foodhub/shared';
import {
  aAutor,
  agruparHistorial,
  aResenaPublica,
  type FilaReporteResuelto,
  type FilaResena,
} from './consultas.js';

/**
 * Reglas del modulo de Resenas que se pueden probar SIN base de datos.
 *
 * Son las cuatro decisiones donde un error no rompe nada visible y por eso hay
 * que fijarlas con pruebas: los dos plazos —que se confunden entre si—, el
 * filtro de moderacion y las dos identidades que el listado sustituye (el autor
 * dado de baja y el plato retirado del catalogo).
 *
 * Mismo criterio que `pedidos/reglas.test.ts`: la logica de negocio vive en
 * funciones puras justamente para poder verificarla asi.
 */

const HORA = 3_600_000;
const DIA = 24 * HORA;

describe('limiteDeEdicionResena', () => {
  it('cuenta 48 horas desde la publicación cuando no hubo pedidos posteriores', () => {
    const fechaPublicacion = new Date('2026-08-01T10:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado: null,
    });

    expect(limite.getTime()).toBe(
      fechaPublicacion.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });

  /**
   * El corazon de RF080: "cada nuevo pedido completado que incluya la misma
   * publicacion reabre la ventana, contando 48 horas desde la fecha de
   * completado de ese pedido".
   */
  it('reabre la ventana desde el último pedido completado si es posterior', () => {
    const fechaPublicacion = new Date('2026-08-01T10:00:00Z');
    const ultimoPedidoCompletado = new Date('2026-08-20T15:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado,
    });

    expect(limite.getTime()).toBe(
      ultimoPedidoCompletado.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });

  /**
   * Un pedido completado ANTES de la reseña es el caso normal: el cliente pide,
   * le entregan y después reseña. No puede acortar la ventana.
   */
  it('ignora un pedido completado anterior a la publicación', () => {
    const fechaPublicacion = new Date('2026-08-10T10:00:00Z');

    const limite = limiteDeEdicionResena({
      fechaPublicacion,
      ultimoPedidoCompletado: new Date('2026-08-09T10:00:00Z'),
    });

    expect(limite.getTime()).toBe(
      fechaPublicacion.getTime() + HORAS_VENTANA_EDICION_RESENA * HORA,
    );
  });
});

describe('ventanaDeEdicionAbierta', () => {
  const fechaPublicacion = new Date('2026-08-01T10:00:00Z');
  const entrada = { fechaPublicacion, ultimoPedidoCompletado: null };

  it('está abierta justo antes de cumplirse las 48 horas', () => {
    const ahora = new Date(fechaPublicacion.getTime() + 48 * HORA - 1);
    expect(ventanaDeEdicionAbierta(entrada, ahora)).toBe(true);
  });

  it('se cierra exactamente al cumplirse las 48 horas', () => {
    const ahora = new Date(fechaPublicacion.getTime() + 48 * HORA);
    expect(ventanaDeEdicionAbierta(entrada, ahora)).toBe(false);
  });
});

describe('dentroDelPlazoParaResenar', () => {
  const ultimoPedidoCompletado = new Date('2026-08-01T10:00:00Z');

  it('admite crear la reseña dentro de los días configurados', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 13 * DIA);
    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(true);
  });

  it('rechaza al cumplirse el plazo', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 14 * DIA);
    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(false);
  });

  /**
   * LOS DOS PLAZOS SON INDEPENDIENTES y esta prueba lo fija: a los 20 días del
   * pedido ya no se puede CREAR, pero una reseña publicada el día 19 sigue
   * siendo editable porque su ventana de 48 horas corre por separado.
   */
  it('el plazo de creación vencido no cierra la ventana de edición', () => {
    const ahora = new Date(ultimoPedidoCompletado.getTime() + 20 * DIA);
    const fechaPublicacion = new Date(
      ultimoPedidoCompletado.getTime() + 19 * DIA,
    );

    expect(
      dentroDelPlazoParaResenar(
        { ultimoPedidoCompletado, limiteDias: 14 },
        ahora,
      ),
    ).toBe(false);
    expect(
      ventanaDeEdicionAbierta(
        { fechaPublicacion, ultimoPedidoCompletado: null },
        ahora,
      ),
    ).toBe(true);
  });
});

describe('contieneTerminoModerado', () => {
  /** El comportamiento por defecto: sin lista cargada el filtro es transparente. */
  it('no bloquea nada con la lista vacía', () => {
    expect(contieneTerminoModerado('cualquier cosa', [])).toBe(false);
  });

  it('detecta el término sin importar mayúsculas ni tildes', () => {
    expect(contieneTerminoModerado('Qué ASCO de comida', ['asco'])).toBe(true);
    expect(contieneTerminoModerado('un ásco tremendo', ['asco'])).toBe(true);
  });

  it('detecta el término aunque esté dentro de una palabra', () => {
    expect(contieneTerminoModerado('reasqueroso', ['asqueroso'])).toBe(true);
  });

  it('no marca un comentario limpio', () => {
    expect(
      contieneTerminoModerado('Muy rico, volvería a pedirlo', ['asco']),
    ).toBe(false);
  });

  it('ignora términos vacíos de la lista', () => {
    expect(contieneTerminoModerado('texto cualquiera', ['', '   '])).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Identidades sustituidas en el listado (US-RES-03, US-RES-04)
// ---------------------------------------------------------------------------

function filaDeEjemplo(cambios: Partial<FilaResena> = {}): FilaResena {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    tipoResena: 'PLATO',
    publicacionId: 'a1b2c3d4-0000-4000-8000-000000000002',
    calificacion: 5,
    comentario: 'Excelente',
    tags: ['Sabor excelente'],
    fotoUrl: null,
    editada: false,
    fechaPublicacion: new Date('2026-08-01T10:00:00Z'),
    nombrePlato: 'Milanesa napolitana',
    publicacionActiva: true,
    autorId: 'a1b2c3d4-0000-4000-8000-000000000003',
    autorNombre: 'Ana',
    autorApellido: 'García',
    autorFotoPerfilUrl: null,
    autorEstadoCuenta: 'ACTIVA',
    ...cambios,
  };
}

describe('aAutor', () => {
  it('devuelve la identidad real de una cuenta activa', () => {
    expect(aAutor(filaDeEjemplo())).toEqual({
      id: 'a1b2c3d4-0000-4000-8000-000000000003',
      nombre: 'Ana García',
      fotoPerfilUrl: null,
    });
  });

  /**
   * US-RES-04: "muestre el autor como 'Usuario eliminado'". La baja es lógica y
   * la reseña sigue contando para el promedio; lo único que desaparece es quién
   * la escribió, incluida la foto y el id.
   */
  it('anonimiza al autor cuando la cuenta fue dada de baja', () => {
    const autor = aAutor(
      filaDeEjemplo({
        autorEstadoCuenta: 'ELIMINADA',
        autorFotoPerfilUrl: 'https://ejemplo/foto.jpg',
      }),
    );

    expect(autor).toEqual({
      id: null,
      nombre: 'Usuario eliminado',
      fotoPerfilUrl: null,
    });
  });
});

describe('aResenaPublica', () => {
  it('muestra el nombre del plato y habilita el enlace si la publicación está activa', () => {
    const publica = aResenaPublica(filaDeEjemplo());

    expect(publica.tipo).toBe('PLATO');
    expect(publica.plato).toEqual({
      publicacionId: 'a1b2c3d4-0000-4000-8000-000000000002',
      nombre: 'Milanesa napolitana',
      enlaceHabilitado: true,
    });
  });

  /**
   * US-RES-03: la reseña de un plato dado de baja permanece visible con
   * "[Plato no disponible]" y el enlace deshabilitado, "preservando la
   * integridad de la reputación construida".
   */
  it('sustituye el nombre y deshabilita el enlace si la publicación fue dada de baja', () => {
    const publica = aResenaPublica(filaDeEjemplo({ publicacionActiva: false }));

    expect(publica.plato?.nombre).toBe(MENSAJES_RESENA.platoNoDisponible);
    expect(publica.plato?.enlaceHabilitado).toBe(false);
  });

  it('normaliza los tags ausentes a una lista vacía', () => {
    expect(aResenaPublica(filaDeEjemplo({ tags: null })).tags).toEqual([]);
  });

  /**
   * Las tres resenas comparten tabla desde la migracion 0015, asi que el mapeo
   * es lo unico que impide que una opinion sobre un cocinero salga al contrato
   * con un plato pegado.
   */
  it('no adjunta plato a una reseña que no es de un plato', () => {
    const publica = aResenaPublica(
      filaDeEjemplo({
        tipoResena: 'COCINERO',
        publicacionId: null,
        nombrePlato: null,
        publicacionActiva: null,
      }),
    );

    expect(publica.tipo).toBe('COCINERO');
    expect(publica.plato).toBeNull();
  });

  /**
   * US-RES-02: la resena a un cliente no es visible para el cliente ni para
   * otros clientes, asi que no hay conversacion publica sobre ella. `social`
   * en `null` es lo que le dice a la tarjeta que no dibuje reacciones, ni
   * respuesta, ni el boton de reportar.
   */
  it('no expone reacciones ni reporte en una reseña a un cliente', () => {
    const publica = aResenaPublica(
      filaDeEjemplo({
        tipoResena: 'CLIENTE',
        publicacionId: null,
        nombrePlato: null,
        publicacionActiva: null,
      }),
    );

    expect(publica.social).toBeNull();
    expect(publica.plato).toBeNull();
  });

  /** En cambio las de plato y las de cocinero si la tienen. */
  it('expone la conversación pública en las reseñas de plato y de cocinero', () => {
    expect(aResenaPublica(filaDeEjemplo()).social).not.toBeNull();
    expect(
      aResenaPublica(
        filaDeEjemplo({
          tipoResena: 'COCINERO',
          publicacionId: null,
          nombrePlato: null,
          publicacionActiva: null,
        }),
      ).social,
    ).not.toBeNull();
  });
});

/**
 * US-RES-07 - La resena al cocinero NO TIENE VENTANA DE EDICION.
 *
 * Aca habia un `describe` de `ventanaDeCalificacionAbierta`, que comprobaba
 * que la calificacion al cocinero se congelaba a las 48 horas y no se reabria.
 * Esa regla se cayo con el modelo: la ventana se justificaba en que la
 * calificacion referia a la experiencia de UN PEDIDO, y al pasar a ser una por
 * cocinero es la opinion vigente del cliente sobre esa persona. Congelarla
 * obligaria a arrastrar para siempre una opinion que ya cambio.
 *
 * La ventana de la resena DE PLATO sigue viva y se prueba mas arriba: esa si
 * describe un producto que se consumio una vez.
 */

describe('agruparHistorial', () => {
  const RESENA = '00000000-0000-4000-8000-000000000001';
  const OTRA = '00000000-0000-4000-8000-000000000002';

  function reporte(
    cambios: Partial<FilaReporteResuelto> = {},
  ): FilaReporteResuelto {
    return {
      resenaId: RESENA,
      decision: 'RECHAZADO',
      adminId: 'admin-1',
      adminNombre: 'Ana Admin',
      fechaResolucion: new Date('2026-10-01T12:00:00Z'),
      reportanteNombre: 'Rita Reporta',
      motivos: ['Spam o publicidad'],
      detalle: null,
      fechaReporte: new Date('2026-09-30T10:00:00Z'),
      ...cambios,
    };
  }

  it('junta en una ronda las denuncias resueltas por la misma decisión', () => {
    const historial = agruparHistorial([
      reporte(),
      reporte({
        reportanteNombre: 'Pablo Reporta',
        fechaReporte: new Date('2026-09-30T09:00:00Z'),
      }),
    ]).get(RESENA);

    expect(historial).toHaveLength(1);
    // Dentro de la ronda, en el orden en que llegaron las denuncias.
    expect(historial?.[0]?.denuncias.map((d) => d.reportanteNombre)).toEqual([
      'Pablo Reporta',
      'Rita Reporta',
    ]);
  });

  it('separa una reseña dejada visible y después ocultada, la última primero', () => {
    const historial = agruparHistorial([
      reporte(),
      reporte({
        decision: 'APROBADO',
        adminId: 'admin-2',
        adminNombre: 'Beto Admin',
        fechaResolucion: new Date('2026-10-20T12:00:00Z'),
        fechaReporte: new Date('2026-10-19T10:00:00Z'),
      }),
    ]).get(RESENA);

    expect(historial?.map((r) => [r.decision, r.adminNombre])).toEqual([
      ['APROBADO', 'Beto Admin'],
      ['RECHAZADO', 'Ana Admin'],
    ]);
  });

  it('mantiene la ronda aunque la cuenta del administrador ya no exista', () => {
    const historial = agruparHistorial([
      reporte({ adminId: null, adminNombre: null }),
    ]).get(RESENA);

    expect(historial?.[0]?.adminNombre).toBeNull();
    expect(historial?.[0]?.denuncias).toHaveLength(1);
  });

  it('no mezcla el historial de dos reseñas distintas', () => {
    const historiales = agruparHistorial([
      reporte(),
      reporte({ resenaId: OTRA }),
    ]);

    expect(historiales.get(RESENA)).toHaveLength(1);
    expect(historiales.get(OTRA)).toHaveLength(1);
  });
});
