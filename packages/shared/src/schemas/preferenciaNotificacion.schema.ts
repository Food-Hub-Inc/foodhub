import { z } from 'zod';
import { type TipoNotificacion, type TipoUsuario } from '../constants/enums.js';

/**
 * US-CFG-05 (RF059) - Preferencias de notificación push, PAN-CFG-01.
 *
 * La tabla `preferencia_notificacion` guarda una fila por (usuario,
 * tipo_notificacion), pero la pantalla no muestra un switch por cada uno de
 * los valores de `TIPO_NOTIFICACION`: agrupa varios bajo una sola etiqueta
 * ("Cambios de estado de mis pedidos" cubre PEDIDO_ACEPTADO, PEDIDO_LISTO,
 * PEDIDO_RECHAZADO y PEDIDO_COMPLETADO a la vez). `GRUPO_PREFERENCIA_NOTIFICACION`
 * es esa unidad de UI; se togglea entera y actualiza todas sus filas juntas.
 *
 * "Publicaciones nuevas de cocineros favoritos" (RF059 / US-NOT-06, switch del
 * cliente) YA está: se sumó el tipo `PUBLICACION_COCINERO_FAVORITO` al enum al
 * implementar el módulo de Notificaciones. Antes quedaba afuera porque no
 * existía el tipo ni quién emitiera esa notificación.
 */
export const GRUPO_PREFERENCIA_NOTIFICACION = [
  'PEDIDO_CREADO',
  'CAMBIO_ESTADO_PEDIDO',
  'MENSAJE_NUEVO',
  'RESENA_RECIBIDA',
  'PUBLICACION_COCINERO_FAVORITO',
  'PUBLICACION_ELIMINADA_ADMIN',
  'AVISO_SISTEMA',
] as const;
export type GrupoPreferenciaNotificacion =
  (typeof GRUPO_PREFERENCIA_NOTIFICACION)[number];

/** Qué `TIPO_NOTIFICACION` cubre cada switch. */
export const TIPOS_POR_GRUPO_PREFERENCIA: Record<
  GrupoPreferenciaNotificacion,
  readonly TipoNotificacion[]
> = {
  PEDIDO_CREADO: ['PEDIDO_CREADO'],
  CAMBIO_ESTADO_PEDIDO: [
    'PEDIDO_ACEPTADO',
    'PEDIDO_LISTO',
    'PEDIDO_RECHAZADO',
    'PEDIDO_COMPLETADO',
  ],
  MENSAJE_NUEVO: ['MENSAJE_NUEVO'],
  RESENA_RECIBIDA: ['RESENA_RECIBIDA'],
  PUBLICACION_COCINERO_FAVORITO: ['PUBLICACION_COCINERO_FAVORITO'],
  PUBLICACION_ELIMINADA_ADMIN: ['PUBLICACION_ELIMINADA_ADMIN'],
  AVISO_SISTEMA: ['AVISO_SISTEMA'],
};

/**
 * Qué switches ve cada rol y en qué orden — RF059, criterios de aceptación de
 * US-CFG-05. El administrador no tiene preferencias de notificación: opera
 * desde el panel web, no recibe push.
 */
export const GRUPOS_PREFERENCIA_POR_ROL: Record<
  TipoUsuario,
  readonly GrupoPreferenciaNotificacion[]
> = {
  CLIENTE: [
    'CAMBIO_ESTADO_PEDIDO',
    'MENSAJE_NUEVO',
    'PUBLICACION_COCINERO_FAVORITO',
    'AVISO_SISTEMA',
  ],
  COCINERO: [
    'PEDIDO_CREADO',
    'CAMBIO_ESTADO_PEDIDO',
    'MENSAJE_NUEVO',
    'RESENA_RECIBIDA',
    'PUBLICACION_ELIMINADA_ADMIN',
    'AVISO_SISTEMA',
  ],
  ADMINISTRADOR: [],
};

/** Tipos críticos (RF059): no se pueden desactivar, se muestran con el switch deshabilitado. */
export const TIPOS_NOTIFICACION_ESENCIALES: readonly TipoNotificacion[] = [
  'AVISO_SISTEMA',
  'PUBLICACION_ELIMINADA_ADMIN',
];

/**
 * Filas de `preferencia_notificacion` a sembrar para un usuario nuevo de este
 * rol (US-AUT-01, US-AUT-02). Único punto que traduce "rol → tipos
 * aplicables"; la migración de datos que sembró las cuentas anteriores a esta
 * US replica el mismo criterio a mano, en SQL.
 */
export function preferenciasIniciales(
  tipoUsuario: TipoUsuario,
): { tipoNotificacion: TipoNotificacion; modificable: boolean }[] {
  const tipos = new Set(
    GRUPOS_PREFERENCIA_POR_ROL[tipoUsuario].flatMap(
      (grupo) => TIPOS_POR_GRUPO_PREFERENCIA[grupo],
    ),
  );

  return [...tipos].map((tipoNotificacion) => ({
    tipoNotificacion,
    modificable: !TIPOS_NOTIFICACION_ESENCIALES.includes(tipoNotificacion),
  }));
}

export const preferenciaNotificacionGrupoSchema = z.object({
  grupo: z.enum(GRUPO_PREFERENCIA_NOTIFICACION),
  activa: z.boolean(),
  /** `false` en los switches esenciales (RF059): la interfaz los muestra deshabilitados. */
  modificable: z.boolean(),
});
export type PreferenciaNotificacionGrupo = z.infer<
  typeof preferenciaNotificacionGrupoSchema
>;

export const preferenciasNotificacionSchema = z.array(
  preferenciaNotificacionGrupoSchema,
);
export type PreferenciasNotificacion = z.infer<
  typeof preferenciasNotificacionSchema
>;

export const actualizarPreferenciaNotificacionSchema = z.object({
  activa: z.boolean(),
});
export type ActualizarPreferenciaNotificacionInput = z.infer<
  typeof actualizarPreferenciaNotificacionSchema
>;
