import { useState } from 'react';
import { View } from 'react-native';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { usePerfil } from '../../hooks/usePerfil';
import { TEXTOS_RESENA } from '../../lib/textos';
import { Pestanas } from '../pedidos/Piezas';
import { AccionDeRespuesta } from './AccionDeRespuesta';
import { ListaDeResenas } from './ListaDeResenas';

/**
 * PAN-RES-02 · Mis reseñas — US-RES-03 (RF082), lado del cocinero.
 *
 * DOS SOLAPAS, porque al cocinero le llegan dos cosas distintas y las dos
 * admiten respuesta:
 *
 *   "Mis platos"  las reseñas de sus platos (US-RES-01)
 *   "Sobre mí"    las que le dejaron a él como cocinero (US-RES-07)
 *
 * LA SEGUNDA ES NUEVA, y es la contracara de haber sacado las reseñas de platos
 * del perfil público. US-RES-05 le da al cocinero derecho a réplica sobre lo
 * que recibe, y desde que las opiniones sobre él aparecen fila por fila en su
 * perfil, necesita un lugar desde donde contestarlas. El perfil público no
 * sirve: es la vista del cliente, y el criterio ubica la respuesta en la
 * sección propia del cocinero.
 *
 * NO RECIBE UN ID: el único cocinero cuyas reseñas se pueden ver desde acá es
 * el de la sesión. Aceptar un id por parámetro convertiría una pantalla
 * personal en un visor de la reputación de cualquiera, que ya existe y es el
 * perfil público.
 *
 * Ninguna de las dos ofrece la acción del estado vacío —"Dejar una reseña"—
 * porque nadie se reseña a sí mismo: esa acción es del cliente que lo mira.
 */
type SolapaDeMisResenas = 'PLATOS' | 'SOBRE_MI';

export function MisResenas() {
  const perfil = usePerfil();
  const [solapa, setSolapa] = useState<SolapaDeMisResenas>('PLATOS');

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

  const cocineroId = perfil.data.id;

  /**
   * Las pestañas viajan como encabezado de la lista y no encima de ella: el
   * listado es un `FlatList`, y ponerlas afuera dejaría dos scrolls anidados.
   * Es el mismo arreglo que usa el perfil del cocinero.
   */
  const pestanas = (
    <Pestanas
      activa={solapa}
      onCambiar={setSolapa}
      opciones={[
        { valor: 'PLATOS', etiqueta: TEXTOS_RESENA.solapaMisPlatos },
        { valor: 'SOBRE_MI', etiqueta: TEXTOS_RESENA.solapaSobreMi },
      ]}
    />
  );

  return (
    <Marco>
      {solapa === 'PLATOS' ? (
        <ListaDeResenas
          encabezado={pestanas}
          origen={{ tipo: 'PLATOS_DEL_COCINERO', cocineroId }}
          pieDeTarjeta={(resena) => <AccionDeRespuesta resena={resena} />}
          textosVacio={{ titulo: TEXTOS_RESENA.sinResenasEnMisPlatos }}
          titulo={TEXTOS_RESENA.tituloResenasDePlatos}
        />
      ) : (
        <ListaDeResenas
          encabezado={pestanas}
          origen={{ tipo: 'COCINERO', cocineroId }}
          pieDeTarjeta={(resena) => <AccionDeRespuesta resena={resena} />}
          textosVacio={{ titulo: TEXTOS_RESENA.sinResenasSobreMi }}
          titulo={TEXTOS_RESENA.tituloOpinionesDelCocinero}
        />
      )}
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
