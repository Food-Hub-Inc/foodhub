import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { EstadoDeError } from '../../src/components/ui/EstadoDeError';
import { CalificarCocinero } from '../../src/screens/resenas/CalificarCocinero';
import { TEXTOS_RESENA } from '../../src/lib/textos';

/**
 * PAN-RES-03 · Reseñar al cocinero — US-RES-07.
 *
 * RECIBE EL COCINERO, NO EL PEDIDO. Antes era al revés, porque la reseña se
 * anclaba al pedido y un cliente que le compró tres veces tenía tres reseñas
 * independientes. Con una sola por cocinero, el pedido dejó de identificar
 * nada: solo habilita el derecho, y eso lo verifica el servidor.
 *
 * Se entra desde dos lugares —el perfil público del cocinero y el detalle de
 * cualquiera de sus pedidos completados— y los dos llevan a la misma reseña.
 *
 * El nombre y la foto viajan como parámetros para dibujar la cabecera sin una
 * consulta extra: las dos pantallas de origen ya los tienen. Son opcionales;
 * sin ellos la pantalla funciona igual.
 */
export default function CalificarCocineroRuta() {
  const { cocineroId, nombre, fotoPerfilUrl } = useLocalSearchParams<{
    cocineroId?: string;
    nombre?: string;
    fotoPerfilUrl?: string;
  }>();

  if (!cocineroId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EncabezadoPantalla
          destinoAlternativo="/(cliente)/pedidos"
          titulo={TEXTOS_RESENA.tituloCalificarCocinero}
        />
        {/* Falta un dato de la navegación, no falló una consulta: la acción
            útil es volver, que es de donde se entra bien. */}
        <EstadoDeError
          mensaje={TEXTOS_RESENA.sinCocinero}
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
      cocineroId={cocineroId}
      fotoPerfilUrl={fotoPerfilUrl ?? null}
      nombre={nombre ?? null}
    />
  );
}
