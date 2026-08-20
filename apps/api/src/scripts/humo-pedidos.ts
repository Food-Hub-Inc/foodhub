/**
 * Prueba de humo del modulo de Pedidos contra foodhub-dev.
 *
 * Ejecuta las tres consultas de lectura con identificadores inexistentes: no
 * verifica reglas de negocio -eso se hace con usuarios reales-, verifica que el
 * SQL que arma Drizzle sea VALIDO. Las subconsultas correlacionadas de
 * `consultas.ts` (total, "queda por resenar", "sin calificar") no se pueden
 * comprobar con tipos ni con vitest sin base.
 */
import {
  listarPedidosDelCliente,
  listarPedidosDelCocinero,
  obtenerDetalle,
} from '../modules/pedidos/pedidos.service.js';

const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const cliente = await listarPedidosDelCliente(ID_INEXISTENTE, {
  pestana: 'EN_CURSO',
  pagina: 1,
  porPagina: 20,
});
console.log('historial del cliente:', JSON.stringify(cliente));

const cocinero = await listarPedidosDelCocinero(ID_INEXISTENTE, {
  pestana: 'NUEVOS',
  pagina: 1,
  porPagina: 20,
});
console.log('bandeja del cocinero:', JSON.stringify(cocinero));

try {
  await obtenerDetalle({
    pedidoId: ID_INEXISTENTE,
    usuarioId: ID_INEXISTENTE,
    rol: 'CLIENTE',
  });
  console.log('ERROR: un pedido ajeno deberia responder 404');
} catch (error) {
  console.log('detalle de un pedido ajeno:', (error as Error).message);
}

process.exit(0);
