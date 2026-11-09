import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { IconoBolsa } from '../../components/iconos';
import { cantidadDeItems, useCarrito } from '../../hooks/useCarrito';
import { TEXTOS_CARRITO } from '../../lib/textos';

/**
 * Botón flotante del carrito — último criterio de US-EXP-07.
 *
 * "Muestre un ícono flotante del carrito con un contador de ítems visible sobre
 * él en todas las pantallas del módulo de exploración, para que el cliente pueda
 * volver al carrito en cualquier momento."
 *
 * Se monta en las cinco pantallas del módulo y se dibuja SOLO si hay algo en el
 * carrito: un botón permanentemente vacío ocuparía la esquina del pulgar sin
 * hacer nada, y el criterio lo pide para "volver al carrito", no para descubrirlo.
 *
 * Va abajo a la derecha, la zona más alcanzable del pulgar (capítulo 4 de la guía
 * de UX), con margen suficiente para no pisar la barra de tabs.
 *
 * Lee el carrito de la caché compartida (`useCarrito`): no dispara una consulta
 * por pantalla, porque las cinco comparten la misma clave.
 */
/**
 * Aire hasta el borde inferior cuando no hay nada más abajo. Es el valor que
 * tenía como clase (`bottom-6`); pasa a número porque ahora se le suma lo que
 * ocupe el pie fijo o la tarjeta emergente de la pantalla que lo monta.
 */
const SEPARACION_BASE = 24;

export function BotonFlotanteDelCarrito({
  separacionInferior = 0,
}: {
  /**
   * Alto de lo que ya está apoyado en el borde inferior de la pantalla.
   *
   * Sin esto el botón se dibujaba ENCIMA del pie fijo de "Agregar al carrito"
   * del detalle del plato y de la tarjeta del cocinero del mapa, y como se
   * pinta después, además se comía el toque en esa zona. Quien lo monta mide
   * ese elemento con `onLayout` y pasa el alto: un número fijo se volvería a
   * solapar en cuanto el pie creciera con un aviso de error.
   */
  separacionInferior?: number;
}) {
  const carrito = useCarrito();
  const cantidad = cantidadDeItems(carrito.data?.carrito);

  if (cantidad === 0) return null;

  return (
    <Pressable
      onPress={() => {
        router.push('/carrito');
      }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-primary"
      style={{ bottom: SEPARACION_BASE + separacionInferior }}
      accessibilityRole="button"
      accessibilityLabel={TEXTOS_CARRITO.irAlCarrito}
      accessibilityValue={{ text: TEXTOS_CARRITO.unidadesEnCarrito(cantidad) }}
    >
      <IconoBolsa size={24} className="text-surface" />

      <View className="absolute right-0 top-0 h-6 min-w-6 items-center justify-center rounded-full border-2 border-surface bg-error px-1">
        <Text className="text-caption font-bold text-surface">
          {cantidad > 9 ? '9+' : String(cantidad)}
        </Text>
      </View>
    </Pressable>
  );
}
