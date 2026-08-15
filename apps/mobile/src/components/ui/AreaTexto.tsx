import { TextInput, View } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Etiqueta } from './Etiqueta';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Campo de texto largo con contador de caracteres.
 *
 * El contador `127/500` de PAN-AUT-02 no es adorno: el schema rechaza más de
 * 500 caracteres y sin el contador el usuario se entera recién al enviar,
 * después de haber escrito de más.
 *
 * El input no corta el texto al llegar al máximo. Truncar en silencio lo que
 * alguien está escribiendo es peor que dejarlo pasar y mostrarle el error: el
 * contador se pone rojo y el schema explica el límite.
 */
export function AreaTexto({
  nombre,
  etiqueta,
  valor,
  onChange,
  maximo,
  error,
  obligatorio = false,
  placeholder,
  className = '',
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  maximo: number;
  error?: string | undefined;
  obligatorio?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  const excedido = valor.length > maximo;
  const borde = Boolean(error) || excedido ? 'border-error' : 'border-border';

  return (
    <View className={className}>
      <Etiqueta
        idCampo={nombre}
        obligatorio={obligatorio}
        sufijo={`${String(valor.length)}/${String(maximo)}`}
      >
        {etiqueta}
      </Etiqueta>

      <View className={`rounded-sm border bg-surface px-3.5 py-3 ${borde}`}>
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colorPlaceholder}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="h-24 text-body text-text-primary"
          accessibilityLabel={etiqueta}
          accessibilityLabelledBy={`${nombre}-label`}
          aria-invalid={Boolean(error)}
          aria-errormessage={error ? `${nombre}-error` : undefined}
        />
      </View>

      <MensajeDeCampo mensaje={error} idCampo={nombre} />
    </View>
  );
}
