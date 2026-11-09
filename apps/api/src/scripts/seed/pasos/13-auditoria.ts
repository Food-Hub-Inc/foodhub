import { eventoSeguridad, registroAuditoria } from '@foodhub/db';
import type { OperacionAuditoria } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import { CATEGORIAS } from '../datos/catalogo.js';
import type { ContextoSeed } from '../lib/contexto.js';
import { FIN_VENTANA, sumarDias, sumarMinutos } from '../lib/tiempo.js';

/**
 * Paso 13 - Auditoria y seguridad (US-AUD-01, US-AUD-02).
 *
 * DOS TABLAS CON RESPONSABILIDADES DISTINTAS:
 *
 *   registro_auditoria  operaciones de NEGOCIO (altas, bajas, modificaciones)
 *   evento_seguridad    LOGIN_FALLIDO y ACCESO_DENEGADO
 *
 * Las filas se derivan de lo que la seed ya creo, no se inventan: hay un ALTA
 * por cada usuario y por cada publicacion, una MODIFICACION por cada
 * publicacion que quedo marcada como editada, y las altas de categorias y de
 * versiones de terminos que hizo el administrador. Si el panel de auditoria
 * mostrara operaciones sobre objetos que no existen, no serviria para probar
 * el filtro por objeto de US-AUD-02.
 */

/** IPs de la LAN del equipo y de conexiones moviles argentinas. */
const IPS = [
  '190.51.12.44',
  '181.45.203.8',
  '200.115.76.19',
  '186.13.44.201',
  '190.220.9.132',
  '2803:9800:9843:8a1b::1',
] as const;

interface FilaAuditoria {
  usuarioId: string | null;
  operacion: OperacionAuditoria;
  tipoObjeto: string;
  objetoAfectadoId: string;
  ipOrigen: string;
  datosAdicionales: Record<string, unknown>;
  fechaHora: Date;
}

function altasDeUsuario(contexto: ContextoSeed): FilaAuditoria[] {
  return [...contexto.usuarios.values()].map((u) => ({
    // El alta la audita el propio usuario que se registro (auth.service.ts).
    usuarioId: u.id,
    operacion: 'ALTA' as const,
    tipoObjeto: 'usuario',
    objetoAfectadoId: u.id,
    ipOrigen: contexto.azar.elegir(IPS),
    datosAdicionales: { email: u.email, tipo: u.tipo },
    fechaHora: u.fechaRegistro,
  }));
}

function movimientosDePublicaciones(contexto: ContextoSeed): FilaAuditoria[] {
  const { azar } = contexto;
  const filas: FilaAuditoria[] = [];

  for (const pub of contexto.publicaciones) {
    filas.push({
      usuarioId: pub.cocineroId,
      operacion: 'ALTA',
      tipoObjeto: 'publicacion',
      objetoAfectadoId: pub.id,
      ipOrigen: azar.elegir(IPS),
      datosAdicionales: {
        nombre: pub.plato.nombre,
        precio: pub.precio,
        categoria: pub.plato.categoria,
      },
      fechaHora: pub.fechaCreacion,
    });

    // Una de cada tres publicaciones se edito al menos una vez (paso 5).
    if (!azar.probabilidad(0.33)) continue;
    filas.push({
      usuarioId: pub.cocineroId,
      operacion: 'MODIFICACION',
      tipoObjeto: 'publicacion',
      objetoAfectadoId: pub.id,
      ipOrigen: azar.elegir(IPS),
      datosAdicionales: {
        campos: ['precio'],
        precioAnterior: Math.round(pub.precio * 0.9),
        precioNuevo: pub.precio,
      },
      fechaHora: sumarDias(pub.fechaCreacion, azar.entero(5, 60)),
    });
  }

  return filas;
}

function movimientosDelAdministrador(contexto: ContextoSeed): FilaAuditoria[] {
  const { azar } = contexto;
  const admin = contexto.administradores[0];
  if (!admin) return [];

  const filas: FilaAuditoria[] = [];

  for (const [indice, semilla] of CATEGORIAS.entries()) {
    const id = contexto.categorias.get(semilla.slug);
    if (!id) continue;
    filas.push({
      usuarioId: admin.id,
      operacion: 'ALTA',
      tipoObjeto: 'categoria',
      objetoAfectadoId: id,
      ipOrigen: azar.elegir(IPS),
      datosAdicionales: { nombre: semilla.nombre },
      fechaHora: sumarDias(admin.fechaRegistro, indice),
    });

    // Las dos categorias inactivas se dieron de baja despues del alta.
    if (semilla.activo) continue;
    filas.push({
      usuarioId: admin.id,
      operacion: 'BAJA',
      tipoObjeto: 'categoria',
      objetoAfectadoId: id,
      ipOrigen: azar.elegir(IPS),
      datosAdicionales: {
        nombre: semilla.nombre,
        motivo: 'Sin publicaciones activas en la categoría',
      },
      fechaHora: sumarDias(admin.fechaRegistro, 90 + indice),
    });
  }

  filas.push({
    usuarioId: admin.id,
    operacion: 'ALTA',
    tipoObjeto: 'version_terminos',
    objetoAfectadoId: contexto.versionTerminosVigenteId,
    ipOrigen: azar.elegir(IPS),
    datosAdicionales: { tipo: 'TERMINOS', numeroVersion: 2 },
    fechaHora: sumarDias(FIN_VENTANA, -9),
  });

  return filas;
}

/**
 * Eventos de seguridad.
 *
 * LOGIN_FALLIDO lo alimenta un Auth Hook de Supabase porque el intento de
 * autenticacion va directo a GoTrue y la API no lo ve. ACCESO_DENEGADO lo
 * escribe el middleware `requiereRol` cuando alguien pide un recurso que su rol
 * no habilita. La seed produce los dos para que PAN-ADM-05 pueda filtrar por
 * tipo y no muestre una sola clase de evento.
 */
function eventosDeSeguridad(contexto: ContextoSeed) {
  const { azar } = contexto;
  const filas = [];

  // Intentos fallidos: sobre todo de cuentas que existen (contrasena mal
  // tipeada) y algunos de correos que no estan registrados.
  const conCuenta = [...contexto.usuarios.values()];
  for (let i = 0; i < 45; i += 1) {
    const existente = azar.probabilidad(0.75);
    const victima = azar.elegir(conCuenta);
    filas.push({
      tipoEvento: 'LOGIN_FALLIDO' as const,
      emailIntentado: existente
        ? victima.email
        : `no.existe${String(i)}@gmail.com`,
      usuarioId: existente ? victima.id : null,
      recursoSolicitado: null,
      ipOrigen: azar.elegir(IPS),
      motivo: existente
        ? 'Contraseña incorrecta'
        : 'El correo no está registrado',
      fechaHora: sumarMinutos(FIN_VENTANA, -azar.entero(60, 90 * 24 * 60)),
    });
  }

  // Accesos denegados: un cliente o cocinero tocando una ruta del panel.
  const sinPanel = [...contexto.clientes, ...contexto.cocineros];
  const rutasDeAdmin = [
    'GET /api/v1/admin/usuarios',
    'GET /api/v1/admin/auditoria',
    'POST /api/v1/configuracion/categorias',
    'PATCH /api/v1/admin/usuarios/estado',
    'GET /api/v1/admin/seguridad/eventos',
  ];

  for (let i = 0; i < 18; i += 1) {
    const quien = azar.elegir(sinPanel);
    filas.push({
      tipoEvento: 'ACCESO_DENEGADO' as const,
      emailIntentado: null,
      usuarioId: quien.id,
      recursoSolicitado: azar.elegir(rutasDeAdmin),
      ipOrigen: azar.elegir(IPS),
      motivo: `El rol ${quien.tipo} no tiene permiso sobre este recurso`,
      fechaHora: sumarMinutos(FIN_VENTANA, -azar.entero(60, 90 * 24 * 60)),
    });
  }

  return filas;
}

export async function sembrarAuditoria(contexto: ContextoSeed): Promise<void> {
  const filas = [
    ...altasDeUsuario(contexto),
    ...movimientosDePublicaciones(contexto),
    ...movimientosDelAdministrador(contexto),
  ].sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime());

  for (let i = 0; i < filas.length; i += 300) {
    await db.insert(registroAuditoria).values(filas.slice(i, i + 300));
  }

  await db.insert(eventoSeguridad).values(eventosDeSeguridad(contexto));
}
