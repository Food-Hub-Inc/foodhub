import { inArray } from 'drizzle-orm';
import { reaccionResena, reporteResena, resena } from '@foodhub/db';
import type { EstadoReporte } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import {
  DETALLES_REPORTE_RESENA,
  MOTIVOS_REPORTE_RESENA,
} from '../datos/textos.js';
import type {
  ContextoSeed,
  ResenaCreada,
  UsuarioCreado,
} from '../lib/contexto.js';
import { FIN_VENTANA, sumarDias } from '../lib/tiempo.js';

/**
 * Paso 8 - Reacciones y moderacion de resenas.
 *
 * Cubre las tres tablas que cuelgan de `resena` y que la seed anterior dejaba
 * vacias: `reaccion_resena`, `reporte_resena` y el estado
 * OCULTA_MODERACION que resulta de aprobar un reporte.
 *
 * LA COLA DE MODERACION NECESITA LAS TRES RESOLUCIONES. Con reportes solo
 * pendientes, PAN-ADM-03 no tiene como mostrar el historial de lo resuelto; con
 * todos resueltos, la bandeja arranca vacia. Se reparten en los tres estados.
 */

/** Reacciona cualquiera menos el autor: nadie vota su propia resena. */
function posiblesReaccionantes(
  contexto: ContextoSeed,
  unaResena: ResenaCreada,
): UsuarioCreado[] {
  return [...contexto.usuarios.values()].filter(
    (usuarioCreado) =>
      usuarioCreado.id !== unaResena.clienteId &&
      usuarioCreado.tipo !== 'ADMINISTRADOR',
  );
}

async function sembrarReacciones(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;
  const filas = [];

  for (const unaResena of contexto.resenas) {
    if (!unaResena.visible || !azar.probabilidad(0.45)) continue;

    const candidatos = posiblesReaccionantes(contexto, unaResena);
    for (const quien of azar.elegirVarios(candidatos, azar.entero(1, 4))) {
      // Una resena elogiosa recoge sobre todo "me gusta"; una mala reparte
      // mas parejo, porque hay quien la encuentra util y quien la discute.
      const pesos =
        unaResena.calificacion >= 4
          ? { ME_GUSTA: 88, NO_ME_GUSTA: 12 }
          : { ME_GUSTA: 55, NO_ME_GUSTA: 45 };

      filas.push({
        resenaId: unaResena.id,
        usuarioId: quien.id,
        tipo: azar.pesado(pesos),
        fechaReaccion: sumarDias(
          unaResena.fechaPublicacion,
          azar.entero(0, 20),
        ),
      });
    }
  }

  if (filas.length === 0) return;
  for (let i = 0; i < filas.length; i += 200) {
    await db.insert(reaccionResena).values(filas.slice(i, i + 200));
  }
}

/**
 * Reportes de resena (PAN-ADM-03).
 *
 * Se eligen sobre todo resenas de una y dos estrellas: son las que en la
 * practica alguien denuncia. `motivos` es un arreglo porque el diagrama lo
 * modela multivalor: un mismo reporte puede invocar spam y lenguaje ofensivo.
 */
async function sembrarReportes(contexto: ContextoSeed): Promise<void> {
  const { azar } = contexto;

  const candidatas = contexto.resenas.filter(
    (r) => r.visible && (r.calificacion <= 2 || azar.probabilidad(0.05)),
  );
  const reportadas = azar.elegirVarios(
    candidatas,
    Math.min(18, candidatas.length),
  );
  if (reportadas.length === 0) return;

  const aOcultar: string[] = [];
  const filas = reportadas.map((unaResena) => {
    const reportante = azar.elegir(posiblesReaccionantes(contexto, unaResena));
    const estadoReporte = azar.pesado({
      PENDIENTE: 40,
      APROBADO: 35,
      RECHAZADO: 25,
    }) as EstadoReporte;

    const fechaReporte = sumarDias(
      unaResena.fechaPublicacion,
      azar.entero(1, 10),
    );
    const resuelto = estadoReporte !== 'PENDIENTE';
    if (estadoReporte === 'APROBADO') aOcultar.push(unaResena.id);

    const fechaResolucion = sumarDias(fechaReporte, azar.entero(1, 6));

    return {
      resenaId: unaResena.id,
      usuarioReportanteId: reportante.id,
      motivos: azar.elegirVarios(MOTIVOS_REPORTE_RESENA, azar.entero(1, 2)),
      detalleAdicional: azar.probabilidad(0.6)
        ? azar.elegir(DETALLES_REPORTE_RESENA)
        : null,
      estadoReporte,
      adminResolutorId: resuelto
        ? azar.elegir(contexto.administradores).id
        : null,
      fechaReporte,
      fechaResolucion: resuelto
        ? fechaResolucion > FIN_VENTANA
          ? FIN_VENTANA
          : fechaResolucion
        : null,
    };
  });

  await db.insert(reporteResena).values(filas);

  // Aprobar el reporte es lo que oculta la resena: el estado de la resena y la
  // resolucion del reporte tienen que contar la misma historia.
  if (aOcultar.length > 0) {
    await db
      .update(resena)
      .set({ estadoResena: 'OCULTA_MODERACION' })
      .where(inArray(resena.id, aOcultar));

    const ocultas = new Set(aOcultar);
    for (const r of contexto.resenas) {
      if (ocultas.has(r.id)) r.visible = false;
    }
  }
}

export async function sembrarModeracion(contexto: ContextoSeed): Promise<void> {
  await sembrarReacciones(contexto);
  await sembrarReportes(contexto);
}
