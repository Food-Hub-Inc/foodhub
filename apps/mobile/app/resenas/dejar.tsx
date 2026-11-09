import { router, useLocalSearchParams } from 'expo-router';
import { DejarResena } from '../../src/screens/resenas/DejarResena';
import { EstadoDeError } from '../../src/components/ui/EstadoDeError';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { TEXTOS_RESENA } from '../../src/lib/textos';

/**
 * PAN-RES-01 · Dejar reseña — US-RES-01.
 *
 * LO QUE SE RESEÑA ES LA PUBLICACIÓN, NO EL PEDIDO. La reseña es por plato
 * (decisión del 2026-08-18), así que la pantalla se abre una vez por cada ítem
 * del pedido que el cliente quiera calificar, y el derecho a opinar lo verifica
 * el servidor por su cuenta contra el historial.
 *
 * `cocineroId` viaja igual, pero NO para reseñar: es lo que permite encadenar con
 * la calificación al cocinero cuando la reseña se publica, que es el criterio
 * de US-RES-01 "ofrezca a continuación la calificación al cocinero de ese
 * pedido". Es opcional: sin él la pantalla funciona y solo no encadena.
 *
 * El parámetro va por query string y no como segmento dinámico de la ruta
 * (`/resenas/[publicacionId]`) para no romper los dos lugares que ya navegan
 * acá —el detalle y el listado de pedidos— ni la ficha del inventario de
 * pantallas, que declara esta ruta sin parámetros.
 */
export default function DejarResenaRuta() {
  const { publicacionId, cocineroId } = useLocalSearchParams<{
    publicacionId?: string;
    cocineroId?: string;
  }>();

  /**
   * Sin publicación no hay nada que reseñar. Pasa si alguien abre la ruta a
   * mano o si un enlace viejo quedó sin el parámetro: se avisa en lugar de
   * dibujar un formulario que no podría guardar nada.
   */
  if (!publicacionId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EncabezadoPantalla
          destinoAlternativo="/(cliente)/pedidos"
          titulo={TEXTOS_RESENA.tituloDejar}
        />
        {/*
          No hay nada que reintentar: falta un dato de la navegación, no falló
          una consulta. La acción útil es volver al pedido, que es de donde se
          entra bien.
        */}
        <EstadoDeError
          mensaje={TEXTOS_RESENA.sinPublicacion}
          onReintentar={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(cliente)/pedidos');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <DejarResena
      cocineroId={cocineroId ?? null}
      publicacionId={publicacionId}
    />
  );
}
