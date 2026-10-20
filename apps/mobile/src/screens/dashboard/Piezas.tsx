import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  MENSAJES_DASHBOARD,
  type ClienteRecurrente,
  type EstadoDistribucion,
  type PlatoMasPedido,
} from '@foodhub/shared';
import { IconoChevronDerecha, IconoEstrella } from '../../components/iconos';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { formatearPrecio } from '../../lib/formato';
import { TEXTOS_DASHBOARD, TEXTOS_PEDIDOS } from '../../lib/textos';
import { AvatarDeParticipante } from '../pedidos/Piezas';
import { MiniaturaDePlato } from '../exploracion/Piezas';
import { CLASE_DE_ESTADO, ETIQUETA_DE_ESTADO } from './estados';

/**
 * Piezas presentacionales de PAN-DASH-01.
 *
 * Ninguna hace consultas ni navega por su cuenta: reciben lo que muestran y, si
 * hace falta, un `onPress`. Mismo reparto que `screens/pedidos/Piezas.tsx`.
 */

/** Una de las tres tarjetas de resumen de US-DASH-01. */
export function TarjetaDeResumen({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-1 rounded-md border border-border bg-surface p-3">
      <Text className="text-caption text-text-secondary" numberOfLines={2}>
        {rotulo}
      </Text>
      <View className="mt-1.5">{children}</View>
    </View>
  );
}

/** El valor grande de una tarjeta de resumen. */
export function ValorDeTarjeta({ children }: { children: string }) {
  return (
    <Text
      className="text-h2 font-extrabold text-text-primary"
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {children}
    </Text>
  );
}

/**
 * La tarjeta "Valoración promedio" de US-DASH-01: el promedio "con
 * representación visual de estrellas", o la leyenda cuando no hay ninguna.
 *
 * No reutiliza `Valoracion` de Exploración aunque el texto del caso vacío sea el
 * mismo: aquélla es una línea de `caption` para acompañar un nombre, y ésta es
 * el valor de una tarjeta. Además el literal es el de US-DASH-01, no el de
 * US-EXP-04; que hoy coincidan palabra por palabra no los convierte en el mismo
 * requisito.
 */
export function ValoracionPromedio({ promedio }: { promedio: number | null }) {
  if (promedio === null) {
    return (
      <View>
        <ValorDeTarjeta>{MENSAJES_DASHBOARD.sinValor}</ValorDeTarjeta>
        <Text className="mt-0.5 text-caption text-text-secondary">
          {MENSAJES_DASHBOARD.sinCalificaciones}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1.5">
      <IconoEstrella size={18} className="text-warning" />
      <ValorDeTarjeta>{promedio.toFixed(1)}</ValorDeTarjeta>
    </View>
  );
}

/**
 * Una sección del dashboard: título, leyenda opcional, acción opcional a la
 * derecha y contenido.
 *
 * La leyenda existe porque las secciones no comparten universo: «Pedidos por
 * día» cuenta todos los pedidos, el ranking solo los completados y la
 * distribución solo los cerrados. Sin decirlo, los números parecen no cerrar.
 */
export function SeccionDelDashboard({
  titulo,
  descripcion,
  accion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="mt-6">
      <View
        className={
          descripcion
            ? 'mb-1 flex-row items-center justify-between'
            : 'mb-3 flex-row items-center justify-between'
        }
      >
        <Text
          className="text-h3 font-bold text-text-primary"
          accessibilityRole="header"
        >
          {titulo}
        </Text>
        {accion}
      </View>
      {descripcion ? (
        <Text className="mb-3 text-caption text-text-secondary">
          {descripcion}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Estado vacío DE UNA SECCIÓN, no de la pantalla.
 *
 * US-DASH-05, último criterio: "muestre en cada sección del dashboard su mensaje
 * de estado vacío correspondiente, sin ocultar las secciones ni mostrar
 * errores". Por eso no se usa `EstadoVacio`, que es `flex-1` y está pensado para
 * ocupar una pantalla entera: acá conviven tres secciones vacías, una debajo de
 * la otra.
 */
export function SeccionVacia({
  icono,
  mensaje,
}: {
  icono: ReactNode;
  mensaje: string;
}) {
  return (
    <View className="items-center rounded-md border border-border bg-surface px-6 py-7">
      <View className="mb-3 h-12 w-12 items-center justify-center overflow-hidden rounded-full">
        <FondoTenue />
        {icono}
      </View>
      <Text className="text-center text-body text-text-secondary">
        {mensaje}
      </Text>
    </View>
  );
}

/**
 * Una fila del ranking de platos (US-DASH-02).
 *
 * "Posición en el ranking, imagen del plato, nombre del plato, categoría,
 * cantidad de veces pedido en el período y precio actual."
 *
 * Un plato dado de baja NO se saca del ranking: lleva "(eliminado)" pegado al
 * nombre, para preservar la integridad de las métricas del período.
 */
export function FilaDeRanking({
  plato,
  puesto,
}: {
  plato: PlatoMasPedido;
  puesto: number;
}) {
  return (
    <View className="flex-row items-center gap-3 border-t border-border px-3 py-3">
      <Text
        className="w-5 text-center text-body font-extrabold text-text-secondary"
        accessibilityLabel={TEXTOS_DASHBOARD.puestoEnElRanking(puesto)}
      >
        {String(puesto)}
      </Text>

      <MiniaturaDePlato
        className="h-14 w-14 rounded-sm"
        imagenDeCategoria={plato.categoria.imagenPredeterminadaUrl}
        imagenUrl={plato.imagenUrl}
      />

      <View className="flex-1">
        <Text
          className="text-body font-bold text-text-primary"
          numberOfLines={2}
        >
          {plato.eliminado
            ? `${plato.nombre} ${MENSAJES_DASHBOARD.sufijoEliminado}`
            : plato.nombre}
        </Text>
        <Text className="text-caption text-text-secondary" numberOfLines={1}>
          {plato.categoria.nombre}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-body font-bold text-text-primary">
          {TEXTOS_DASHBOARD.vecesPedido(plato.vecesPedido)}
        </Text>
        <Text className="text-caption text-text-secondary">
          {formatearPrecio(plato.precioActual)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Una fila de clientes recurrentes (US-DASH-03).
 *
 * "Foto de perfil, nombre completo, cantidad de pedidos realizados en el período
 * y monto total acumulado de esos pedidos."
 *
 * Una cuenta eliminada muestra "Usuario eliminado" y queda sin foto —la API ya
 * no manda ni el nombre ni la imagen— pero conserva sus números. Tampoco es
 * tocable: no hay perfil al que ir.
 */
export function FilaDeCliente({
  cliente,
  onPress,
}: {
  cliente: ClienteRecurrente;
  onPress: () => void;
}) {
  const nombre = cliente.eliminado
    ? MENSAJES_DASHBOARD.usuarioEliminado
    : `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();

  const contenido = (
    <>
      <AvatarDeParticipante fotoPerfilUrl={cliente.fotoPerfilUrl} />

      <View className="flex-1">
        <Text
          className={`text-body font-bold ${
            cliente.eliminado ? 'text-text-disabled' : 'text-text-primary'
          }`}
          numberOfLines={1}
        >
          {nombre}
        </Text>
        <Text className="text-caption text-text-secondary">
          {`${TEXTOS_PEDIDOS.cantidadDePedidos(cliente.cantidadPedidos)} · ${formatearPrecio(cliente.montoTotal)}`}
        </Text>
      </View>
    </>
  );

  if (cliente.eliminado) {
    return (
      <View className="flex-row items-center gap-3 border-t border-border px-3 py-3">
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-border px-3 py-3 active:bg-background"
      accessibilityRole="button"
      accessibilityLabel={TEXTOS_DASHBOARD.abrirPerfilDelCliente(nombre)}
    >
      {contenido}
      <IconoChevronDerecha size={18} className="text-text-disabled" />
    </Pressable>
  );
}

/**
 * Una línea del listado que va debajo del gráfico (US-DASH-04).
 *
 * "El nombre de cada estado, su cantidad absoluta y su porcentaje sobre el total
 * de pedidos del período." Se dibujan LOS CUATRO siempre, también los que están
 * en cero, "para que el cocinero tenga siempre una vista completa de todos los
 * estados posibles".
 *
 * El punto de color repite el del segmento, pero el dato lo lleva el texto: un
 * badge que solo se distinga por el color no es legible sin visión del color.
 */
export function FilaDeDistribucion({
  estado,
  cantidad,
  porcentaje,
}: {
  estado: EstadoDistribucion;
  cantidad: number;
  porcentaje: number;
}) {
  return (
    <View className="flex-row items-center gap-2.5 border-t border-border px-3 py-2.5">
      <View
        className={`h-2.5 w-2.5 rounded-full ${CLASE_DE_ESTADO[estado].fondo}`}
      />
      <Text className="flex-1 text-body text-text-primary" numberOfLines={1}>
        {ETIQUETA_DE_ESTADO[estado]}
      </Text>
      <Text className="text-body font-bold text-text-primary">
        {String(cantidad)}
      </Text>
      <Text className="w-14 text-right text-caption text-text-secondary">
        {TEXTOS_DASHBOARD.porcentaje(porcentaje)}
      </Text>
    </View>
  );
}
