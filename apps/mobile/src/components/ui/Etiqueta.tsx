import { Text, View } from 'react-native';

/**
 * Etiqueta de un campo de formulario.
 *
 * El asterisco rojo de los obligatorios sale de la maquetación (PAN-AUT-01).
 * Se marca como decorativo para los lectores de pantalla porque la
 * obligatoriedad ya viaja en `accessibilityState` del input: sin eso, el lector
 * leería "Nombre asterisco".
 */
export function Etiqueta({
  children,
  obligatorio = false,
  sufijo,
  idCampo,
}: {
  children: string;
  obligatorio?: boolean;
  /** Contenido alineado a la derecha: el contador `127/500` de PAN-AUT-02. */
  sufijo?: string;
  idCampo: string;
}) {
  return (
    <View className="mb-1.5 flex-row items-center justify-between">
      <Text
        className="text-label font-semibold text-text-primary"
        nativeID={`${idCampo}-label`}
      >
        {children}
        {obligatorio ? (
          <Text className="text-label text-error" accessibilityElementsHidden>
            {' *'}
          </Text>
        ) : null}
      </Text>
      {sufijo !== undefined ? (
        <Text className="text-caption text-text-secondary">{sufijo}</Text>
      ) : null}
    </View>
  );
}
