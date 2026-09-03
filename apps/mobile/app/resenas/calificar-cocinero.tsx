import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { EstadoDeError } from '../../src/components/ui/EstadoDeError';
import { CalificarCocinero } from '../../src/screens/resenas/CalificarCocinero';
import { TEXTOS_RESENA } from '../../src/lib/textos';

/**
 * PAN-RES-03 · Calificar al cocinero — US-RES-07.
 *
 * RECIBE EL PEDIDO, NO EL COCINERO. Es la diferencia con
 * `calificar-cliente.tsx`: allá la calificación es una por par cocinero-cliente
 * y alcanza con el cliente, y acá es una por PEDIDO. Con el cocinero solo no se
 * sabría cuál de sus pedidos se está calificando, y el cliente que le compró
 * tres veces tiene tres calificaciones independientes.
 *
 * El nombre, la foto y la fecha viajan como parámetros para dibujar la cabecera
 * sin una consulta extra: el detalle del pedido, que es de donde se entra, ya
 * los tiene. Son opcionales; sin ellos la pantalla funciona igual.
 */
export default function CalificarCocineroRuta() {
  const { pedidoId, nombre, fotoPerfilUrl, fechaPedido } =
    useLocalSearchParams<{
      pedidoId?: string;
      nombre?: string;
      fotoPerfilUrl?: string;
      fechaPedido?: string;
    }>();

  if (!pedidoId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EncabezadoPantalla
          destinoAlternativo="/(cliente)/pedidos"
          titulo={TEXTOS_RESENA.tituloCalificarCocinero}
        />
        {/* Falta un dato de la navegación, no falló una consulta: la acción
            útil es volver al pedido, que es de donde se entra bien. */}
        <EstadoDeError
          mensaje={TEXTOS_RESENA.sinPedido}
          onReintentar={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(cliente)/pedidos');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <CalificarCocinero
      fechaPedido={fechaPedido ?? null}
      fotoPerfilUrl={fotoPerfilUrl ?? null}
      nombre={nombre ?? null}
      pedidoId={pedidoId}
    />
  );
}
