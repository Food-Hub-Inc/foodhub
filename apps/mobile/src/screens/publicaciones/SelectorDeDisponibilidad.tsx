import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { EstadoPublicacion } from '@foodhub/shared';
import { IconoChevronAbajo, IconoTilde } from '../../components/iconos';
import { HojaInferior } from '../../components/ui/HojaInferior';
// El mapa de colores se movio a `lib/disponibilidad.ts`: lo comparte con la
// tarjeta del feed y el detalle del plato del modulo de Exploracion, donde el
// segundo criterio de US-EXP-01 exige la misma diferenciacion cromatica.
import { ESTILO_DISPONIBILIDAD } from '../../lib/disponibilidad';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import { OPCIONES_ESTADO } from './listado';

/**
 * Selector visual e interactivo del estado de disponibilidad (US-PUB-04),
 * embebido en cada `TarjetaDePublicacion` de "Mis publicaciones". Reemplaza
 * al badge estático que dejó ahí US-PUB-05.
 *
 * Es puramente presentacional -no sabe nada de mutaciones ni de react-query,
 * solo de `valor`/`onCambiar`-, igual criterio que `CampoDesplegable`: quien
 * lo usa decide qué hacer con la elección.
 *
 * Elegir una opción distinta a la actual cierra la hoja y dispara `onCambiar`
 * en el mismo gesto: el criterio de aceptación exige que el cambio "se
 * aplica de forma inmediata sin necesidad de confirmación adicional", así
 * que -a diferencia de `HojaDeFiltros`- no hay un botón de confirmación acá.
 */
export function SelectorDeDisponibilidad({
  valor,
  onCambiar,
}: {
  valor: EstadoPublicacion;
  onCambiar: (estado: EstadoPublicacion) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const estado = ESTILO_DISPONIBILIDAD[valor];
  const etiqueta =
    OPCIONES_ESTADO.find((opcion) => opcion.valor === valor)?.etiqueta ?? '';

  return (
    <>
      <Pressable
        onPress={() => {
          setAbierta(true);
        }}
        className="flex-row items-center gap-1.5 rounded-full border border-border px-2 py-1"
        accessibilityRole="button"
        accessibilityLabel={TEXTOS_PUBLICACIONES.disponibilidad}
        accessibilityValue={{ text: etiqueta }}
      >
        <View className={`h-2 w-2 rounded-full ${estado.punto}`} />
        <Text className={`text-caption font-semibold ${estado.texto}`}>
          {etiqueta}
        </Text>
        <IconoChevronAbajo size={12} className="text-text-disabled" />
      </Pressable>

      <HojaInferior
        abierta={abierta}
        etiquetaAccesible={TEXTOS_PUBLICACIONES.disponibilidad}
        onCerrar={() => {
          setAbierta(false);
        }}
      >
        <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
          {TEXTOS_PUBLICACIONES.disponibilidad}
        </Text>

        {OPCIONES_ESTADO.map((opcion) => {
          const seleccionada = opcion.valor === valor;
          const estiloOpcion = ESTILO_DISPONIBILIDAD[opcion.valor];
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => {
                setAbierta(false);
                if (opcion.valor !== valor) onCambiar(opcion.valor);
              }}
              className="min-h-14 flex-row items-center justify-between px-1"
              accessibilityRole="radio"
              accessibilityState={{ checked: seleccionada }}
              accessibilityLabel={opcion.etiqueta}
            >
              <View className="flex-row items-center gap-2">
                <View
                  className={`h-2 w-2 rounded-full ${estiloOpcion.punto}`}
                />
                <Text
                  className={`text-body ${seleccionada ? 'font-bold text-primary' : 'text-text-primary'}`}
                >
                  {opcion.etiqueta}
                </Text>
              </View>
              {seleccionada ? (
                <IconoTilde size={18} className="text-primary" />
              ) : null}
            </Pressable>
          );
        })}
      </HojaInferior>
    </>
  );
}
