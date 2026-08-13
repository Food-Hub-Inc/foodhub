import { crearConexion } from '@foodhub/db';
import { env } from '../config/env.js';

/**
 * Instancia unica de la conexion a PostgreSQL para todo el proceso.
 *
 * Se crea una sola vez y se reutiliza: abrir un pool por request agotaria el
 * cupo de conexiones del plan gratuito de Supabase en cuestion de segundos.
 */
export const db = crearConexion(env.DATABASE_URL);
