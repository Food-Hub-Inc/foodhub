import { ScrollView, View } from 'react-native';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { IconoEngranaje } from '../../components/iconos';
import { BotonDeNotificaciones } from '../../components/ui/BotonDeNotificaciones';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { usePerfil } from '../../hooks/usePerfil';
import { TEXTOS_PERFIL } from '../../lib/textos';
import { AccionesDeCuenta } from './AccionesDeCuenta';
import { FormularioDePerfil } from './FormularioDePerfil';
import { TarjetaDeIdentidad } from './TarjetaDeIdentidad';

/**
 * PAN-GURP-01 · Mi perfil — US-GURP-01 a US-GURP-04.
 *
 * La MISMA pantalla para el cliente y el cocinero. Las dos barras de tabs la
 * montan en su quinto destino y lo que cambia es el contenido, no la pantalla:
 * el cocinero ve además su descripción pública y su distintivo de rol. Tener
 * dos copias haría que una corrección entrara en una sola.
 *
 * LO QUE FALTA Y POR QUÉ: el mockup muestra una fila con tres métricas —platos,
 * rating y pedidos—. No se dibuja porque ningún endpoint del contrato las
 * devuelve todavía; salen de los módulos de Publicaciones, Reseñas y Pedidos,
 * que se codifican después. Poner números inventados en el perfil propio sería
 * peor que no mostrarlos.
 */
export function MiPerfil() {
  const perfil = usePerfil();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        accion={
          <View className="flex-row items-center">
            <BotonDeNotificaciones />
            <View className="h-11 w-11 items-center justify-center">
              <IconoEngranaje className="text-text-primary" size={22} />
            </View>
          </View>
        }
        titulo={TEXTOS_PERFIL.titulo}
      />

      {perfil.isPending ? <CargandoPerfil /> : null}

      {perfil.isError ? (
        <EstadoDeError
          mensaje={MENSAJES_USUARIO.perfilNoDisponible}
          onReintentar={() => {
            void perfil.refetch();
          }}
        />
      ) : null}

      {perfil.data ? (
        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <TarjetaDeIdentidad
            onCambiarFoto={() => {
              // La subida va del dispositivo directo a Supabase Storage por URL
              // firmada (punto 1.3.1.11) y ese flujo se codifica junto con el
              // módulo de Publicaciones, que es el que lo estrena.
            }}
            perfil={perfil.data}
          />
          <FormularioDePerfil perfil={perfil.data} />
          <AccionesDeCuenta />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

/**
 * Esqueleto con la forma del contenido real: la tarjeta de identidad, el bloque
 * de campos y la lista de acciones. Un spinner suelto no anticipa nada y hace
 * que la pantalla "salte" cuando por fin llegan los datos.
 */
function CargandoPerfil() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="h-48 rounded-md" />
      <Esqueleto className="mt-4 h-64 rounded-md" />
      <Esqueleto className="mt-6 h-56 rounded-md" />
    </View>
  );
}
