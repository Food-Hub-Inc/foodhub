import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { View } from 'react-native';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { usePerfil } from '../../hooks/usePerfil';
import { TEXTOS_RESENA } from '../../lib/textos';
import { AccionDeRespuesta } from './AccionDeRespuesta';
import { ListaDeResenas } from './ListaDeResenas';

/**
 * PAN-RES-02 · Mis reseñas — US-RES-03 (RF082), lado del cocinero.
 *
 * Es la MISMA lista que ve el cliente en la solapa "Reseñas" del perfil
 * público, con el mismo resumen y las mismas tarjetas. Cambia el encuadre: acá
 * es una pantalla propia con su encabezado, y el cocinero está mirando lo que
 * recibió.
 *
 * NO RECIBE UN ID: el único cocinero cuyas reseñas se pueden ver desde acá es
 * el de la sesión. Aceptar un id por parámetro convertiría una pantalla
 * personal en un visor de la reputación de cualquiera, que ya existe y es el
 * perfil público.
 *
 * No ofrece la acción del estado vacío —"Dejar una reseña"— porque nadie se
 * reseña a sí mismo: esa acción es para el cliente que mira el perfil.
 */
export function MisResenas() {
  const perfil = usePerfil();

  if (perfil.isError) {
    return (
      <Marco>
        <EstadoDeError
          mensaje={MENSAJES_USUARIO.perfilNoDisponible}
          onReintentar={() => {
            void perfil.refetch();
          }}
        />
      </Marco>
    );
  }

  if (!perfil.data) {
    return (
      <Marco>
        <View className="px-4 pt-4">
          <Esqueleto className="h-44 rounded-md" />
          <Esqueleto className="mt-3 h-28 rounded-md" />
        </View>
      </Marco>
    );
  }

  return (
    <Marco>
      {/*
        US-RES-05 ubica la respuesta en "Mi reputación" y no en el perfil
        público: el cocinero responde desde su propia sección, no desde la
        vista que ve el cliente.
      */}
      <ListaDeResenas
        cocineroId={perfil.data.id}
        pieDeTarjeta={(resena) => <AccionDeRespuesta resena={resena} />}
      />
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/perfil"
        titulo={TEXTOS_RESENA.tituloMisResenas}
      />
      {children}
    </SafeAreaView>
  );
}
