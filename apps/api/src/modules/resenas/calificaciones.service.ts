import { and, avg, count, eq } from 'drizzle-orm';
import { resena, usuario } from '@foodhub/db';
import {
  MINIMO_PEDIDOS_PARA_REPUTACION_CLIENTE,
  type PerfilPublicoCliente,
  type ReputacionCliente,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { noEncontrado } from '../../middleware/error.middleware.js';
import { pedidosCompletadosDelCliente } from './consultas.js';

/**
 * Modulo de Resenas y Calificaciones — el cliente resenado (US-RES-02, RF081)
 * y su perfil publico (US-DASH-03).
 *
 * ES LA DIRECCION PRIVADA DE LA REPUTACION. A diferencia de las otras dos, la
 * resena a un cliente no es publica: el cliente resenado NO la ve, y otros
 * clientes tampoco. Solo la ven los cocineros.
 *
 * ESA PRIVACIDAD YA NO LA DA EL MODELO. Hasta la migracion 0015 vivia en su
 * propia tabla; ahora es una fila de `resena` con `tipo_resena = 'CLIENTE'`, y
 * lo unico que la protege es que las rutas que la exponen esten bajo
 * `requiereRol('COCINERO')`. Hay una prueba de router dedicada a verificarlo,
 * y toda consulta nueva sobre clientes tiene que sumarse a ella.
 *
 * EL ALTA Y LA EDICION NO ESTAN ACA: son las mismas de cualquier resena y
 * viven en `resenas.service.ts`, discriminadas por tipo. Aca queda lo que solo
 * aplica al cliente: su reputacion agregada y su ficha.
 */

/** Las resenas VISIBLE que recibio un cliente. */
function resenasDelCliente(clienteId: string) {
  return and(
    eq(resena.tipoResena, 'CLIENTE'),
    eq(resena.clienteDestinoId, clienteId),
    // A diferencia de la tabla que reemplaza, estas resenas ahora SI son
    // moderables: al unificarse heredaron `estado_resena`. Una oculta por el
    // administrador no puede seguir pesando en el promedio.
    eq(resena.estadoResena, 'VISIBLE'),
  );
}

/**
 * US-RES-02 - Reputacion de un cliente, tal como la ve un cocinero.
 *
 * "Muestre el promedio de estrellas del cliente y la cantidad total de
 * cocineros que lo calificaron. Si el cliente registra menos de 3 pedidos
 * completados en la plataforma, muestre 'Cliente nuevo'."
 *
 * EL UMBRAL SON PEDIDOS COMPLETADOS, NO RESENAS RECIBIDAS. Son dos cantidades
 * distintas y el criterio nombra la primera: un cliente con diez pedidos y
 * ninguna resena no es nuevo, solo no tiene reputacion todavia. Por eso
 * `esClienteNuevo` no se deriva de `cantidadCocineros`.
 *
 * Cuando es nuevo se devuelve el promedio en `null`: si viajara igual,
 * cualquier pantalla que se olvide de mirar la bandera lo mostraria, y la regla
 * que protege al cliente recien llegado dependeria de que nadie se distraiga.
 */
export async function reputacionDeCliente(
  clienteId: string,
): Promise<ReputacionCliente> {
  const [[agregado], completados] = await Promise.all([
    db
      .select({ promedio: avg(resena.calificacion), cantidad: count() })
      .from(resena)
      .where(resenasDelCliente(clienteId)),
    pedidosCompletadosDelCliente(clienteId),
  ]);

  const esClienteNuevo = completados < MINIMO_PEDIDOS_PARA_REPUTACION_CLIENTE;
  const promedioCrudo = agregado?.promedio ?? null;

  return {
    promedio:
      esClienteNuevo || promedioCrudo === null
        ? null
        : Math.round(Number(promedioCrudo) * 10) / 10,
    cantidadCocineros: agregado?.cantidad ?? 0,
    esClienteNuevo,
  };
}

/**
 * US-DASH-03 - Ficha del perfil publico de un cliente, para el cocinero.
 *
 * LAS COLUMNAS SE ENUMERAN UNA POR UNA, y aca eso no es estilo sino una regla
 * de privacidad. `usuario` guarda el correo y la ubicacion -un punto PostGIS
 * exacto, no una zona-, y los dos quedan fuera del contrato: publicarle a
 * cualquier cocinero donde vive un cliente seria otra cosa que mostrarle su
 * reputacion. Un `select` de la tabla entera los traeria sin que nadie lo note.
 *
 * Tampoco viaja `motivo_suspension` ni nada de la aceptacion de terminos, que
 * son internos. Por eso este contrato existe en vez de reusar el de
 * `GET /usuarios/:id`, que si trae todo eso y por lo mismo es soloAdministrador.
 */
export async function perfilPublicoDeCliente(
  clienteId: string,
): Promise<PerfilPublicoCliente> {
  const [fila] = await db
    .select({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      fotoPerfilUrl: usuario.fotoPerfilUrl,
      fechaRegistro: usuario.fechaRegistro,
      estadoCuenta: usuario.estadoCuenta,
      tipo: usuario.tipo,
    })
    .from(usuario)
    .where(eq(usuario.id, clienteId))
    .limit(1);

  // Un cocinero o un administrador "no existen" como perfil de cliente: la
  // pantalla que lo abre es la del cliente, y devolver la ficha de otro rol
  // mostraria datos que ninguna vista contempla.
  if (fila?.tipo !== 'CLIENTE') throw noEncontrado('el cliente');

  const reputacion = await reputacionDeCliente(clienteId);

  return {
    id: fila.id,
    nombre: fila.nombre,
    apellido: fila.apellido,
    fotoPerfilUrl: fila.fotoPerfilUrl,
    fechaRegistro: fila.fechaRegistro.toISOString(),
    cuentaEliminada: fila.estadoCuenta === 'ELIMINADA',
    reputacion,
  };
}
