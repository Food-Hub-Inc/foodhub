import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconoChevronAbajo, IconoTilde } from '../iconos';
import { Etiqueta } from './Etiqueta';
import { HojaInferior } from './HojaInferior';
import { MensajeDeCampo } from './MensajeDeCampo';

export interface OpcionDesplegable {
  valor: string;
  etiqueta: string;
}

/**
 * Campo de opción única sobre `HojaInferior` (US-PUB-01, desplegable de
 * categoría del alta de un plato).
 *
 * Genérico a propósito -no sabe nada de categorías- para que cualquier otro
 * formulario del sistema que necesite un desplegable de una sola opción lo
 * reuse en vez de repetir el mismo patrón de `HojaDeOrden`.
 *
 * El estado de apertura vive ACÁ, no en quien lo usa: igual criterio que
 * `SelectorDeUbicacion` y `SelectorDeFoto`, que también resuelven su propio
 * popover para que el formulario que los contiene solo tenga que pasar
 * `valor`/`onCambiar`.
 */
export function CampoDesplegable({
  nombre,
  etiqueta,
  valor,
  opciones,
  onCambiar,
  error,
  obligatorio = false,
  placeholder,
  className = '',
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  opciones: readonly OpcionDesplegable[];
  onCambiar: (valor: string) => void;
  error?: string | undefined;
  obligatorio?: boolean;
  placeholder: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const seleccionada = opciones.find((opcion) => opcion.valor === valor);
  const borde = error ? 'border-error' : 'border-border';

  return (
    <View className={className}>
      <Etiqueta idCampo={nombre} obligatorio={obligatorio}>
        {etiqueta}
      </Etiqueta>

      <Pressable
        onPress={() => {
          setAbierta(true);
        }}
        className={`h-14 flex-row items-center justify-between rounded-sm border bg-surface px-3.5 ${borde}`}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityLabelledBy={`${nombre}-label`}
      >
        <Text
          className={`flex-1 text-body ${seleccionada ? 'text-text-primary' : 'text-text-disabled'}`}
          numberOfLines={1}
        >
          {seleccionada?.etiqueta ?? placeholder}
        </Text>
        <IconoChevronAbajo size={16} className="text-text-secondary" />
      </Pressable>

      <MensajeDeCampo mensaje={error} idCampo={nombre} />

      <HojaInferior
        abierta={abierta}
        etiquetaAccesible={etiqueta}
        onCerrar={() => {
          setAbierta(false);
        }}
      >
        <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
          {etiqueta}
        </Text>

        <ListaDeOpciones
          onSeleccionar={(nuevoValor) => {
            onCambiar(nuevoValor);
            setAbierta(false);
          }}
          opciones={opciones}
          valor={valor}
        />
      </HojaInferior>
    </View>
  );
}

function ListaDeOpciones({
  opciones,
  valor,
  onSeleccionar,
}: {
  opciones: readonly OpcionDesplegable[];
  valor: string;
  onSeleccionar: (valor: string) => void;
}) {
  return (
    <>
      {opciones.map((opcion) => {
        const marcada = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => {
              onSeleccionar(opcion.valor);
            }}
            className="min-h-14 flex-row items-center justify-between px-1"
            accessibilityRole="radio"
            accessibilityState={{ checked: marcada }}
            accessibilityLabel={opcion.etiqueta}
          >
            <Text
              className={`text-body ${marcada ? 'font-bold text-primary' : 'text-text-primary'}`}
            >
              {opcion.etiqueta}
            </Text>
            {marcada ? <IconoTilde size={18} className="text-primary" /> : null}
          </Pressable>
        );
      })}
    </>
  );
}
