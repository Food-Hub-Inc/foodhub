import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATEGORIAS, ROLES_DESTINO, TIPOS_CONSULTA } from './catalogo.js';
import { CAPITULOS_AYUDA, FAQ } from './ayuda.js';
import { PLATOS, platosPorCategoria } from './platos.js';
import { TICKETS } from './textos.js';
import { COCINEROS, USUARIOS } from './usuarios.js';
import { VERSIONES_TERMINOS } from './legales.js';

/**
 * Consistencia del dataset.
 *
 * La seed cruza cinco archivos de datos por `slug` y por nombre, y ninguna de
 * esas referencias la comprueba TypeScript: un plato que apunta a una
 * categoria inexistente o un avatar que falta compilan igual y explotan a
 * mitad del script, con la base ya borrada. Estas pruebas corren en un
 * segundo y convierten ese fallo en un error de `pnpm test`.
 */

const CARPETA_IMAGENES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'imagenes',
);

const slugsDeCategoria = new Set(CATEGORIAS.map((c) => c.slug));

describe('categorías', () => {
  it('tiene imagen para cada una', () => {
    for (const categoria of CATEGORIAS) {
      expect(
        existsSync(join(CARPETA_IMAGENES, 'categorias', categoria.imagen)),
        `falta imagenes/categorias/${categoria.imagen}`,
      ).toBe(true);
    }
  });

  it('respeta el largo de `categoria.nombre` (varchar 80)', () => {
    for (const categoria of CATEGORIAS) {
      expect(categoria.nombre.length).toBeLessThanOrEqual(80);
    }
  });

  it('incluye al menos una dada de baja, para probar la baja lógica', () => {
    expect(CATEGORIAS.some((c) => !c.activo)).toBe(true);
  });
});

describe('platos', () => {
  it('apunta siempre a una categoría existente', () => {
    for (const plato of PLATOS) {
      expect(
        slugsDeCategoria.has(plato.categoria),
        `${plato.slug} apunta a la categoría inexistente "${plato.categoria}"`,
      ).toBe(true);
    }
  });

  it('tiene imagen para cada uno', () => {
    for (const plato of PLATOS) {
      expect(
        existsSync(join(CARPETA_IMAGENES, 'platos', plato.imagen)),
        `falta imagenes/platos/${plato.imagen}`,
      ).toBe(true);
    }
  });

  it('respeta los límites de `publicacion` (nombre 120, descripción 1000)', () => {
    for (const plato of PLATOS) {
      expect(plato.nombre.length).toBeLessThanOrEqual(120);
      expect(plato.descripcion.length).toBeLessThanOrEqual(1000);
    }
  });

  it('tiene precio y tiempo de preparación positivos', () => {
    for (const plato of PLATOS) {
      expect(plato.precioBase).toBeGreaterThan(0);
      // El paso 5 le resta hasta 10 minutos al publicar, y el CHECK
      // `publicacion_tiempo_preparacion_valido` exige mayor que cero.
      expect(plato.tiempoPreparacion).toBeGreaterThan(10);
    }
  });

  it('no repite slugs', () => {
    expect(new Set(PLATOS.map((p) => p.slug)).size).toBe(PLATOS.length);
  });
});

describe('usuarios', () => {
  it('no repite correos ni slugs', () => {
    expect(new Set(USUARIOS.map((u) => u.email)).size).toBe(USUARIOS.length);
    expect(new Set(USUARIOS.map((u) => u.slug)).size).toBe(USUARIOS.length);
  });

  it('tiene avatar para cada uno', () => {
    for (const usuario of USUARIOS) {
      expect(
        existsSync(join(CARPETA_IMAGENES, 'perfiles', `${usuario.slug}.png`)),
        `falta imagenes/perfiles/${usuario.slug}.png`,
      ).toBe(true);
    }
  });

  it('respeta los límites de `usuario` (nombre 60, apellido 60, email 255)', () => {
    for (const usuario of USUARIOS) {
      expect(usuario.nombre.length).toBeLessThanOrEqual(60);
      expect(usuario.apellido.length).toBeLessThanOrEqual(60);
      expect(usuario.email.length).toBeLessThanOrEqual(255);
    }
  });
});

describe('cocineros', () => {
  it('declara ubicación: el CHECK `usuario_cocinero_con_ubicacion` la exige', () => {
    for (const cocinero of COCINEROS) {
      expect(
        cocinero.ubicacion,
        `${cocinero.slug} no tiene ubicación`,
      ).toBeDefined();
    }
  });

  it('está dentro del Gran Mendoza', () => {
    for (const { slug, ubicacion } of COCINEROS) {
      expect(ubicacion!.x, `${slug} fuera de rango`).toBeGreaterThan(-69.1);
      expect(ubicacion!.x, `${slug} fuera de rango`).toBeLessThan(-68.6);
      expect(ubicacion!.y, `${slug} fuera de rango`).toBeGreaterThan(-33.2);
      expect(ubicacion!.y, `${slug} fuera de rango`).toBeLessThan(-32.7);
    }
  });

  it('tiene al menos cinco platos publicables: el paso 5 pide entre 5 y 8', () => {
    for (const cocinero of COCINEROS) {
      const disponibles = (cocinero.especialidades ?? []).flatMap((categoria) =>
        platosPorCategoria(categoria),
      );
      expect(
        disponibles.length,
        `${cocinero.slug} solo tiene ${String(disponibles.length)} platos entre sus especialidades`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it('usa especialidades que existen y están activas', () => {
    const activas = new Set(
      CATEGORIAS.filter((c) => c.activo).map((c) => c.slug),
    );
    for (const cocinero of COCINEROS) {
      for (const especialidad of cocinero.especialidades ?? []) {
        expect(
          activas.has(especialidad),
          `${cocinero.slug} cocina "${especialidad}", que no es una categoría activa`,
        ).toBe(true);
      }
    }
  });

  it('tiene una mezcla de desenlaces y un volumen de pedidos declarados', () => {
    for (const cocinero of COCINEROS) {
      expect(cocinero.pedidos, `${cocinero.slug} sin volumen`).toBeGreaterThan(
        0,
      );
      expect(
        cocinero.mezclaEstados,
        `${cocinero.slug} sin mezcla`,
      ).toBeDefined();
      expect(
        cocinero.tendencia,
        `${cocinero.slug} sin tendencia`,
      ).toBeDefined();
    }
  });

  it('respeta el largo de `cocinero.descripcion_publica` (varchar 500)', () => {
    for (const cocinero of COCINEROS) {
      expect((cocinero.descripcionPublica ?? '').length).toBeLessThanOrEqual(
        500,
      );
    }
  });
});

describe('ayuda y soporte', () => {
  it('usa roles destino que la seed crea', () => {
    const roles = new Set<string>(ROLES_DESTINO);
    for (const capitulo of CAPITULOS_AYUDA)
      expect(roles.has(capitulo.rol)).toBe(true);
    for (const pregunta of FAQ) expect(roles.has(pregunta.rol)).toBe(true);
  });

  it('tiene manual para los dos roles', () => {
    for (const rol of ROLES_DESTINO) {
      expect(CAPITULOS_AYUDA.some((c) => c.rol === rol)).toBe(true);
    }
  });

  it('no deja capítulos sin secciones', () => {
    for (const capitulo of CAPITULOS_AYUDA) {
      expect(
        capitulo.secciones.length,
        `"${capitulo.titulo}" vacío`,
      ).toBeGreaterThan(0);
    }
  });

  it('respeta los límites de título (160) y pregunta (300)', () => {
    for (const capitulo of CAPITULOS_AYUDA) {
      expect(capitulo.titulo.length).toBeLessThanOrEqual(160);
      for (const seccion of capitulo.secciones) {
        expect(seccion.titulo.length).toBeLessThanOrEqual(160);
      }
    }
    for (const pregunta of FAQ) {
      expect(pregunta.pregunta.length).toBeLessThanOrEqual(300);
    }
  });
});

describe('tickets de soporte', () => {
  const slugs = new Set(USUARIOS.map((u) => u.slug));
  const tipos = new Set(TIPOS_CONSULTA.map((t) => t.nombre));

  it('los abre un usuario del dataset', () => {
    for (const ticket of TICKETS) {
      expect(
        slugs.has(ticket.autor),
        `autor desconocido: ${ticket.autor}`,
      ).toBe(true);
    }
  });

  it('usa un tipo de consulta existente y activo', () => {
    const activos = new Set(
      TIPOS_CONSULTA.filter((t) => t.activo).map((t) => t.nombre),
    );
    for (const ticket of TICKETS) {
      expect(tipos.has(ticket.tipoConsulta)).toBe(true);
      expect(
        activos.has(ticket.tipoConsulta),
        `"${ticket.tipoConsulta}" está dado de baja`,
      ).toBe(true);
    }
  });

  it('adjunta archivos que existen', () => {
    for (const ticket of TICKETS) {
      if (!ticket.adjunto) continue;
      expect(
        existsSync(join(CARPETA_IMAGENES, ticket.adjunto.archivoLocal)),
        `falta ${ticket.adjunto.archivoLocal}`,
      ).toBe(true);
    }
  });

  it('cubre los tres estados', () => {
    for (const estado of ['ABIERTO', 'EN_PROCESO', 'CERRADO'] as const) {
      expect(TICKETS.some((t) => t.estado === estado)).toBe(true);
    }
  });

  it('respeta el largo de `ticket_soporte.asunto` (varchar 200)', () => {
    for (const ticket of TICKETS) {
      expect(ticket.asunto.length).toBeLessThanOrEqual(200);
    }
  });
});

describe('versiones legales', () => {
  it('tiene exactamente una versión VIGENTE de cada tipo', () => {
    for (const tipo of ['TERMINOS', 'PRIVACIDAD'] as const) {
      const vigentes = VERSIONES_TERMINOS.filter(
        (v) => v.tipo === tipo && v.estado === 'VIGENTE',
      );
      expect(
        vigentes.length,
        `${tipo} debe tener una sola versión vigente`,
      ).toBe(1);
    }
  });

  it('numera las versiones sin repetir dentro de cada tipo', () => {
    for (const tipo of ['TERMINOS', 'PRIVACIDAD'] as const) {
      const numeros = VERSIONES_TERMINOS.filter((v) => v.tipo === tipo).map(
        (v) => v.numeroVersion,
      );
      expect(new Set(numeros).size).toBe(numeros.length);
    }
  });

  it('publica la vigente después que las archivadas', () => {
    for (const tipo of ['TERMINOS', 'PRIVACIDAD'] as const) {
      const delTipo = VERSIONES_TERMINOS.filter((v) => v.tipo === tipo);
      const vigente = delTipo.find((v) => v.estado === 'VIGENTE');
      for (const archivada of delTipo.filter((v) => v.estado === 'ARCHIVADA')) {
        expect(archivada.fechaPublicacion.getTime()).toBeLessThan(
          vigente!.fechaPublicacion.getTime(),
        );
      }
    }
  });
});
