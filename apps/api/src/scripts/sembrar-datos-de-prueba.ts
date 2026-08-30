import { cerrarConexion } from '@foodhub/db';
import { env } from '../config/env.js';
import { PASSWORD_DE_PRUEBA } from './seed/datos/usuarios.js';
import { sembrar } from './seed/index.js';
import { SEMILLA_BASE } from './seed/lib/aleatorio.js';
import { FIN_VENTANA, INICIO_VENTANA } from './seed/lib/tiempo.js';

/**
 * Reset y carga del dataset de pruebas de FoodHub.
 *
 *   pnpm --filter @foodhub/api run seed -- --confirmar
 *
 * QUE HACE
 *
 *   1. BORRA todas las tablas del esquema `public`.
 *   2. BORRA todas las cuentas de `auth.users` (GoTrue).
 *   3. VACIA los cuatro buckets de Supabase Storage.
 *   4. Carga el dataset completo: 27 usuarios, ~90 publicaciones, ~750 pedidos
 *      cerrados, resenas, calificaciones, chats, favoritos, tickets,
 *      notificaciones y auditoria.
 *
 * ES DESTRUCTIVO Y NO SE PUEDE DESHACER. Por eso exige `--confirmar` y se
 * niega a correr si `APP_ENV` no es `development`.
 *
 * POR QUE LA GUARDA MIRA APP_ENV Y NO EL NOMBRE DE LA BASE
 *
 * `APP_ENV` es la variable que el equipo ya usa para distinguir ambientes (ver
 * config/env.ts) y la que define contra que proyecto de Supabase apunta todo
 * lo demas. Comparar contra el host de `DATABASE_URL` obligaria a hornear en
 * el codigo el identificador del proyecto de Supabase, que cambia si alguna vez
 * se recrea `foodhub-dev`.
 *
 * OPCIONES
 *
 *   --confirmar          obligatoria. Sin ella el script solo informa.
 *   --semilla=<numero>   cambia la semilla del generador y produce otro
 *                        dataset, igual de reproducible. Por defecto siempre
 *                        genera EXACTAMENTE los mismos datos.
 */

function leerSemilla(argv: readonly string[]): number {
  const argumento = argv.find((valor) => valor.startsWith('--semilla='));
  if (!argumento) return SEMILLA_BASE;

  const numero = Number(argumento.slice('--semilla='.length));
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(
      '--semilla espera un entero positivo, por ejemplo --semilla=12345',
    );
  }
  return numero;
}

function verificarAmbiente(): void {
  if (env.APP_ENV !== 'development') {
    throw new Error(
      `APP_ENV es "${env.APP_ENV}". Este script solo corre en development: borra la base entera.`,
    );
  }
}

function anunciar(): void {
  const host = new URL(env.SUPABASE_URL).host;
  console.warn(`
  FoodHub - dataset de pruebas
  ---------------------------------------------------------------------------
  Proyecto Supabase   ${host}
  Ambiente            ${env.APP_ENV}
  Ventana de datos    ${INICIO_VENTANA.toISOString().slice(0, 10)} a ${FIN_VENTANA.toISOString().slice(0, 10)}
  Contraseña          ${PASSWORD_DE_PRUEBA} (todas las cuentas)
  ---------------------------------------------------------------------------
`);
}

async function principal(): Promise<void> {
  verificarAmbiente();
  anunciar();

  if (!process.argv.includes('--confirmar')) {
    console.warn(`  Este script BORRA todo lo que haya en esa base: todas las tablas de
  \`public\`, todas las cuentas de autenticación y todos los archivos de
  Storage. No se puede deshacer.

  Si es lo que querés, volvé a correrlo agregando --confirmar:

      pnpm --filter @foodhub/api run seed -- --confirmar
`);
    return;
  }

  const inicio = Date.now();
  const { resumen } = await sembrar(leerSemilla(process.argv.slice(2)));

  console.warn('\n  Filas por tabla');
  console.warn(
    '  ---------------------------------------------------------------------------',
  );
  for (const { tabla, filas } of resumen) {
    if (filas === 0) continue;
    console.warn(`  ${tabla.padEnd(34)} ${String(filas).padStart(7)}`);
  }

  const vacias = resumen
    .filter((fila) => fila.filas === 0)
    .map((fila) => fila.tabla);
  if (vacias.length > 0) {
    console.warn(`\n  Sin filas: ${vacias.join(', ')}`);
  }

  console.warn(
    `\n  Listo en ${((Date.now() - inicio) / 1000).toFixed(1)} s. Entrá con cualquiera de los correos y la contraseña ${PASSWORD_DE_PRUEBA}.\n`,
  );
}

principal()
  .then(async () => {
    await cerrarConexion();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(
      `\n  [error] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    if (error instanceof Error && error.stack) console.error(error.stack);
    await cerrarConexion();
    process.exit(1);
  });
