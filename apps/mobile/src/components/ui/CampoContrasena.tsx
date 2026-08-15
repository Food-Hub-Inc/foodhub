import { useState } from 'react';
import { Pressable } from 'react-native';
import { TEXTOS_LOGIN } from '../../lib/textos';
import { IconoCandado, IconoOjo, IconoOjoTachado } from '../iconos';
import { CampoTexto } from './CampoTexto';

/**
 * Campo de contraseña con el toggle de visibilidad de PAN-AUT-03.
 *
 * El ojo NO es opcional en un teléfono: sin él, escribir una contraseña larga
 * a ciegas en un teclado táctil hace que el usuario la simplifique. Va con
 * `accessibilityLabel` porque es un control sin texto visible, y la etiqueta
 * cambia con el estado para que el lector anuncie qué va a pasar al tocarlo.
 */
export function CampoContrasena({
  nombre,
  etiqueta,
  valor,
  onChange,
  error,
  placeholder,
  nueva = false,
  className,
}: {
  nombre: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  error?: string | undefined;
  placeholder?: string;
  /** `true` en registro y cambio de contraseña: el gestor propone una nueva. */
  nueva?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <CampoTexto
      nombre={nombre}
      etiqueta={etiqueta}
      valor={valor}
      onChange={onChange}
      error={error}
      obligatorio
      placeholder={placeholder}
      secreto={!visible}
      autoCompletar={nueva ? 'password-new' : 'password'}
      className={className}
      icono={<IconoCandado size={20} className="text-text-secondary" />}
      accion={
        <Pressable
          onPress={() => {
            setVisible((previo) => !previo);
          }}
          // El ícono mide 20 px: el padding lo lleva al mínimo táctil de 44.
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? TEXTOS_LOGIN.ocultarContrasena
              : TEXTOS_LOGIN.mostrarContrasena
          }
        >
          {visible ? (
            <IconoOjoTachado size={20} className="text-text-secondary" />
          ) : (
            <IconoOjo size={20} className="text-text-secondary" />
          )}
        </Pressable>
      }
    />
  );
}
