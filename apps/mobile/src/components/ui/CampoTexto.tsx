import type { ReactNode } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Etiqueta } from './Etiqueta';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Campo de texto del sistema (guía visual, sección 03: estados normal, foco y
 * error).
 *
 * El borde rojo y el mensaje de abajo aparecen juntos, nunca uno sin el otro:
 * el borde solo dice "acá hay algo mal" y el mensaje dice qué.
 */
export interface PropsCampoTexto {
  /** Identificador estable del campo. Ata el input con su etiqueta y su error. */
  nombre: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  error?: string | undefined;
  obligatorio?: boolean;
  placeholder?: string;
  /** A?cono a la izquierda: sobre para el correo, candado para la contraseA±a. */
  icono?: ReactNode;
  /** Control a la derecha: el toggle de visibilidad de PAN-AUT-03. */
  accion?: ReactNode;
  secreto?: boolean;
  tipoTeclado?: KeyboardTypeOptions;
  autoCompletar?:
    'email' | 'name' | 'family-name' | 'password' | 'password-new' | 'off';
  mayusculas?: 'none' | 'words' | 'sentences';
  /**
   * Longitud maxima del valor. Se pasa al `TextInput` nativo, que
   * trunca la entrada. Esta validacion la refuerza el schema de zod en
   * el server; lo de aca es solo UX.
   */
  maxLength?: number;
  className?: string;
}

export function CampoTexto({
  nombre,
  etiqueta,
  valor,
  onChange,
  error,
  obligatorio = false,
  placeholder,
  icono,
  accion,
  secreto = false,
  tipoTeclado,
  autoCompletar = 'off',
  mayusculas = 'none',
  maxLength,
  className = '',
}: PropsCampoTexto) {
  const estiloPlaceholder = useResolveClassNames('text-text-disabled');
  const colorPlaceholder =
    typeof estiloPlaceholder.color === 'string'
      ? estiloPlaceholder.color
      : undefined;

  const borde = error ? 'border-error' : 'border-border';

  return (
    <View className={className}>
      <Etiqueta idCampo={nombre} obligatorio={obligatorio}>
        {etiqueta}
      </Etiqueta>

      <View
        className={`h-14 flex-row items-center gap-2 rounded-sm border bg-surface px-3.5 ${borde}`}
      >
        {icono}
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colorPlaceholder}
          secureTextEntry={secreto}
          keyboardType={tipoTeclado}
          autoComplete={autoCompletar}
          autoCapitalize={mayusculas}
          autoCorrect={false}
          maxLength={maxLength}
          className="flex-1 text-body text-text-primary"
          accessibilityLabel={etiqueta}
          accessibilityLabelledBy={`${nombre}-label`}
          accessibilityState={{ disabled: false }}
          aria-invalid={Boolean(error)}
          aria-errormessage={error ? `${nombre}-error` : undefined}
        />
        {accion}
      </View>

      <MensajeDeCampo mensaje={error} idCampo={nombre} />
    </View>
  );
}
