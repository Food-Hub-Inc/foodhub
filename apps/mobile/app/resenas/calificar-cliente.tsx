import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { EstadoDeError } from '../../src/components/ui/EstadoDeError';
import { CalificarCliente } from '../../src/screens/resenas/CalificarCliente';
import { TEXTOS_RESENA } from '../../src/lib/textos';

/**
 * PAN-RES-02 · Calificar cliente — US-RES-02.
 *
 * RECIBE EL CLIENTE, NO EL PEDIDO. La calificación es una por par
 * cocinero-cliente: el cocinero sale de la sesión y con el cliente el par queda
 * determinado. El pedido solo habilitó el derecho a opinar, y eso lo verifica
 * el servidor por su cuenta contra `historial_estado_pedido`.
 *
 * El nombre y la foto viajan como parámetros porque no hay endpoint que le
 * permita a un cocinero consultar los datos de un cliente. Son opcionales: sin
 * ellos la pantalla funciona igual, solo que sin encabezado.
 */
export default function CalificarClienteRuta() {
  const { clienteId, nombre, fotoPerfilUrl } = useLocalSearchParams<{
    clienteId?: string;
    nombre?: string;
    fotoPerfilUrl?: string;
  }>();

  if (!clienteId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EncabezadoPantalla
          destinoAlternativo="/(cocinero)/pedidos"
          titulo={TEXTOS_RESENA.tituloCalificar}
        />
        {/* Falta un dato de la navegación, no falló una consulta: la acción
            útil es volver al pedido, que es de donde se entra bien. */}
        <EstadoDeError
          mensaje={TEXTOS_RESENA.sinCliente}
          onReintentar={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(cocinero)/pedidos');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <CalificarCliente
      clienteId={clienteId}
      fotoPerfilUrl={fotoPerfilUrl ?? null}
      nombre={nombre ?? null}
    />
  );
}
