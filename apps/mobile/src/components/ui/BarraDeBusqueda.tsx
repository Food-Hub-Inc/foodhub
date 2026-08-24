import { TextInput, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { IconoBuscar } from '../iconos';

/**
 * Barra de búsqueda de un listado.
 *
 * Sin etiqueta ni mensaje de error, a diferencia de `CampoTexto`: no es un campo
 * de un formulario que se valide, sino un filtro que se aplica mientras se
 * escribe. El texto que llega a la consulta lo difiere quien la usa
 * (`useValorDebounced`), no este componente: la barra sólo informa cada
 * pulsación.
 *
 * La comparten "Mis publicaciones" (US-PUB-05) y el listado de conversaciones
 * (US-MSG-04), que la dibujan igual y filtran con el mismo criterio: contiene,
 * insensible a mayúsculas.
 */
export function BarraDeBusqueda({
  valor,
  onCambiar,
  placeholder,
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder: string;
}) {
  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  return (
    <View className="h-11 flex-1 flex-row items-center gap-2 rounded-sm border border-border bg-surface px-3">
      <IconoBuscar className="text-text-disabled" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCorrect={false}
        className="flex-1 text-body text-text-primary"
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={colorPlaceholder}
        value={valor}
      />
    </View>
  );
}
