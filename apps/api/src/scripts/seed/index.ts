import { sql } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import { crearAleatorio, SEMILLA_BASE } from './lib/aleatorio.js';
import { crearContexto, type ContextoSeed } from './lib/contexto.js';
import { resetear } from './pasos/01-resetear.js';
import { sembrarCatalogo } from './pasos/02-catalogo.js';
import { sembrarUsuarios } from './pasos/03-usuarios.js';
import { sembrarLegales } from './pasos/04-legales.js';
import { sembrarPublicaciones } from './pasos/05-publicaciones.js';
import { sembrarPedidos } from './pasos/06-pedidos.js';
import { sembrarReputacion } from './pasos/07-resenas.js';
import { sembrarModeracion } from './pasos/08-moderacion.js';
import { sembrarFavoritos } from './pasos/09-favoritos.js';
import { sembrarMensajeria } from './pasos/10-mensajeria.js';
import { sembrarAyudaYSoporte } from './pasos/11-ayuda.js';
import { sembrarNotificaciones } from './pasos/12-notificaciones.js';
import { sembrarAuditoria } from './pasos/13-auditoria.js';

/**
 * Orquestador de la seed.
 *
 * EL ORDEN NO ES NEGOCIABLE: cada paso depende de las claves que dejaron los
 * anteriores. Catalogo antes que publicaciones (categoria), usuarios antes que
 * legales (`version_terminos.admin_autor_id`), pedidos antes que resenas (el
 * derecho a opinar nace de un pedido completado), resenas antes que moderacion.
 *
 * Cada paso hace sus propias escrituras y NO hay una transaccion global. Es
 * deliberado: las cuentas de GoTrue se crean por HTTP y no participan de la
 * transaccion de PostgreSQL, asi que un rollback dejaria credenciales sin
 * perfil. Ante un fallo la reparacion es volver a correr el script entero, que
 * empieza borrando todo.
 */

interface Paso {
  nombre: string;
  ejecutar: (contexto: ContextoSeed) => Promise<void>;
}

const PASOS: readonly Paso[] = [
  { nombre: 'Catálogo y parámetros', ejecutar: sembrarCatalogo },
  { nombre: 'Usuarios y cuentas', ejecutar: sembrarUsuarios },
  { nombre: 'Términos y privacidad', ejecutar: sembrarLegales },
  { nombre: 'Publicaciones', ejecutar: sembrarPublicaciones },
  { nombre: 'Pedidos e historial', ejecutar: sembrarPedidos },
  { nombre: 'Reseñas y calificaciones', ejecutar: sembrarReputacion },
  { nombre: 'Reacciones y moderación', ejecutar: sembrarModeracion },
  { nombre: 'Favoritos', ejecutar: sembrarFavoritos },
  { nombre: 'Mensajería', ejecutar: sembrarMensajeria },
  { nombre: 'Ayuda y soporte', ejecutar: sembrarAyudaYSoporte },
  { nombre: 'Notificaciones', ejecutar: sembrarNotificaciones },
  { nombre: 'Auditoría y seguridad', ejecutar: sembrarAuditoria },
];

function segundos(desde: number): string {
  return `${((Date.now() - desde) / 1000).toFixed(1)} s`;
}

/** Conteo final por tabla, para verificar de un vistazo que quedó cargado. */
async function resumenDeTablas(): Promise<{ tabla: string; filas: number }[]> {
  const nombres = await db.execute<{ tabla: string }>(sql`
    select c.relname as tabla
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not exists (
        select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
      )
    order by c.relname
  `);

  const resumen = [];
  for (const { tabla } of nombres) {
    const filas = await db.execute<{ total: number }>(
      sql.raw(`select count(*)::int as total from "public"."${tabla}"`),
    );
    resumen.push({ tabla, filas: [...filas][0]?.total ?? 0 });
  }
  return resumen;
}

export interface ResultadoSeed {
  resumen: { tabla: string; filas: number }[];
}

export async function sembrar(semilla = SEMILLA_BASE): Promise<ResultadoSeed> {
  const contexto = crearContexto(crearAleatorio(semilla));

  const inicioReset = Date.now();
  const reset = await resetear();
  console.warn(
    `  1. Reset                        ${segundos(inicioReset).padStart(8)}  ` +
      `${String(reset.tablasVaciadas)} tablas, ${String(reset.cuentasBorradas)} cuentas, ` +
      `${String(reset.archivosBorrados)} archivos`,
  );

  for (const [indice, paso] of PASOS.entries()) {
    const inicio = Date.now();
    await paso.ejecutar(contexto);
    console.warn(
      `  ${String(indice + 2).padStart(2)}. ${paso.nombre.padEnd(28)} ${segundos(inicio).padStart(8)}`,
    );
  }

  return { resumen: await resumenDeTablas() };
}
