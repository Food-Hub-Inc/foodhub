import { and, eq, inArray } from 'drizzle-orm';
import { usuario } from '@foodhub/db';
import {
  MENSAJES_NOTIFICACION,
  type AvisoGeneralInput,
  type DestinatarioAviso,
  type ResultadoAvisoGeneral,
  type TipoUsuario,
} from '@foodhub/shared';
import { db } from '../../lib/db.js';
import { registrarOperacion } from '../auditoria/auditoria.service.js';
import { emitirNotificacionEnLote } from './emision.service.js';

/**
 * Avisos generales del administrador — US-NOT-04 / RF037.
 *
 * Un aviso no es una entidad propia: el diagrama de clases lo modela como una
 * `Notificacion` de tipo AVISO_SISTEMA por destinatario, con el título y el
 * cuerpo que escribió el administrador. Por eso emitir un aviso es un INSERT en
 * lote y el despachador hace el resto, igual que el abanico de US-NOT-06.
 *
 * SOLO CUENTAS ACTIVAS (decisión del equipo del 13/10/2026): una cuenta
 * suspendida o dada de baja no puede iniciar sesión para leerlo, y la
 * eliminada además ya no tiene dispositivos activos.
 */

const TIPOS_POR_DESTINATARIO: Record<DestinatarioAviso, TipoUsuario[]> = {
  TODOS: ['CLIENTE', 'COCINERO'],
  CLIENTE: ['CLIENTE'],
  COCINERO: ['COCINERO'],
};

export async function emitirAvisoGeneral(entrada: {
  aviso: AvisoGeneralInput;
  adminId: string;
  ipOrigen: string | null;
}): Promise<ResultadoAvisoGeneral> {
  const { aviso, adminId } = entrada;

  const destinatarios = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(
      and(
        inArray(usuario.tipo, TIPOS_POR_DESTINATARIO[aviso.destinatario]),
        eq(usuario.estadoCuenta, 'ACTIVA'),
      ),
    );

  const { titulo, cuerpo } = MENSAJES_NOTIFICACION.avisoGeneral(
    aviso.titulo,
    aviso.mensaje,
  );

  // Esencial: no filtra por preferencias, así que se escriben todas.
  const emitidas = await emitirNotificacionEnLote({
    usuarioDestinoIds: destinatarios.map((d) => d.id),
    tipo: 'AVISO_SISTEMA',
    titulo,
    cuerpo,
    objetoAfectadoId: null,
  });

  // RF097: el aviso es un alta de notificaciones. No hay un id único que
  // auditar (es una fila por destinatario); el detalle lo dice todo.
  void registrarOperacion({
    usuarioId: adminId,
    operacion: 'ALTA',
    tipoObjeto: 'notificacion',
    objetoAfectadoId: null,
    ipOrigen: entrada.ipOrigen,
    datosAdicionales: {
      tipoNotificacion: 'AVISO_SISTEMA',
      titulo,
      destinatario: aviso.destinatario,
      destinatarios: emitidas,
    },
  });

  return { destinatarios: emitidas };
}
