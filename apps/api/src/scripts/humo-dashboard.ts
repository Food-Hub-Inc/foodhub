/**
 * Prueba de humo del modulo de Dashboard del cocinero contra foodhub-dev.
 *
 * Ejecuta `obtenerActividad` con un identificador inexistente: no verifica
 * reglas de negocio -eso se hace con un cocinero real y pedidos cargados-,
 * verifica que el SQL que arma Drizzle sea VALIDO.
 *
 * Es la unica forma de cubrir este modulo. Vitest corre sin base (el
 * `DATABASE_URL` de `vitest.config.ts` apunta a un puerto cerrado a proposito),
 * y las cuatro consultas del dashboard son justamente lo que no se puede
 * comprobar con tipos: dos `GROUP BY` con columnas dependientes de la clave
 * primaria, un `HAVING` sobre `count(distinct ...)` y una suma de `numeric`
 * casteada a texto.
 *
 * Con un cocinero inexistente el resultado esperado es todo en cero, las dos
 * listas vacias y la valoracion en null. Se le puede pasar el id de un cocinero
 * real como argumento para leer sus metricas y contrastarlas a mano:
 *
 *   pnpm --filter @foodhub/api exec tsx src/scripts/humo-dashboard.ts <uuid>
 */
import { rangoDePeriodo } from '@foodhub/shared';
import { obtenerActividad } from '../modules/dashboard/dashboard.service.js';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const cocineroId = process.argv[2] ?? ID_INEXISTENTE;

// "Este ano": el rango mas ancho de US-DASH-05, para que ninguna de las cuatro
// consultas se ahorre trabajo por quedarse sin filas antes de tiempo.
const { desde, hasta } = rangoDePeriodo('ANIO');

const actividad = await obtenerActividad(cocineroId, {
  desde: desde.toISOString(),
  hasta: hasta.toISOString(),
});

console.log('cocinero:', cocineroId);
console.log('resumen:', JSON.stringify(actividad.resumen));
console.log('distribucion:', JSON.stringify(actividad.distribucion));
console.log('platos mas pedidos:', JSON.stringify(actividad.platosMasPedidos));
console.log(
  'clientes recurrentes:',
  JSON.stringify(actividad.clientesRecurrentes),
);

process.exit(0);
