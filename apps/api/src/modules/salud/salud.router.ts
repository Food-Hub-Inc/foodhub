import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import { env } from '../../config/env.js';

/**
 * Endpoints de diagnostico.
 *
 * Railway consulta /salud para decidir si una nueva version quedo sana antes
 * de dirigirle trafico. Si responde 503, mantiene la instancia anterior.
 */
export const saludRouter: Router = Router();

/** Chequeo superficial: responde si el proceso esta vivo. */
saludRouter.get('/salud', (_req, res) => {
  res.json({
    estado: 'ok',
    ambiente: env.APP_ENV,
    version: process.env.npm_package_version ?? '0.1.0',
    fecha: new Date().toISOString(),
  });
});

/**
 * Chequeo profundo: verifica que la base responda.
 *
 * Se expone aparte del anterior porque son preguntas distintas: "el proceso
 * esta vivo" y "el proceso puede atender". Un despliegue con la cadena de
 * conexion mal configurada pasa el primero y falla el segundo.
 */
saludRouter.get('/salud/completo', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ estado: 'ok', baseDeDatos: 'ok', ambiente: env.APP_ENV });
  } catch {
    res.status(503).json({ estado: 'degradado', baseDeDatos: 'sin conexión' });
  }
});
