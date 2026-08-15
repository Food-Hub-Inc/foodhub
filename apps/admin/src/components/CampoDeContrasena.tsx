import { useState } from 'react';
import { Button, FieldError, Input, Label, TextField } from '@heroui/react';
import { TEXTOS_LOGIN } from '../lib/textos.js';
import { CampoConIcono } from './CampoConIcono.js';
import { IconoCandado, IconoOcultar, IconoVer } from './iconos/index.js';

/**
 * Campo de contraseña con alternador de visibilidad.
 *
 * Lo usan las dos pantallas públicas del panel —el ingreso (PAN-AUT-03) y la
 * definición de contraseña de un administrador invitado (US-GURP-06)—, así que
 * el alternador se comporta igual en ambas: mismo ícono, misma etiqueta y mismo
 * lugar.
 *
 * Mostrar u ocultar cambia el `type` del input y no aplica un filtro de CSS por
 * encima: si el valor no viaja en un campo `password`, el gestor de contraseñas
 * del navegador deja de reconocerlo y no ofrece guardarlo.
 *
 * La visibilidad es estado propio del campo y no sube al formulario: es una
 * preferencia momentánea de lectura, no un dato que haya que validar ni enviar.
 */
export function CampoDeContrasena({
  etiqueta,
  valor,
  alCambiar,
  error,
  nombre,
  autoComplete,
  placeholder,
  autoFocus = false,
  alSalir,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  nombre: string;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string | undefined;
  autoFocus?: boolean;
  /** Se dispara al abandonar el campo, para recién ahí mostrar su error. */
  alSalir?: (() => void) | undefined;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoComplete={autoComplete}
      isInvalid={Boolean(error)}
      name={nombre}
      onChange={alCambiar}
      type={visible ? 'text' : 'password'}
      value={valor}
      // Se difunde en vez de pasarse directo porque `exactOptionalPropertyTypes`
      // distingue "sin onBlur" de "onBlur en undefined", y TextField solo acepta
      // lo primero.
      {...(alSalir === undefined ? {} : { onBlur: alSalir })}
    >
      <Label>{etiqueta}</Label>

      <CampoConIcono icono={<IconoCandado className="size-4.5" />}>
        <Input
          autoFocus={autoFocus}
          className="w-full pr-11 pl-10"
          {...(placeholder === undefined ? {} : { placeholder })}
        />
        <Button
          aria-label={
            visible
              ? TEXTOS_LOGIN.ocultarContrasena
              : TEXTOS_LOGIN.mostrarContrasena
          }
          className="absolute top-1/2 right-1.5 size-8 -translate-y-1/2 text-text-secondary"
          isIconOnly
          onPress={() => {
            setVisible((estaVisible) => !estaVisible);
          }}
          size="sm"
          variant="ghost"
        >
          {visible ? (
            <IconoOcultar className="size-4.5" />
          ) : (
            <IconoVer className="size-4.5" />
          )}
        </Button>
      </CampoConIcono>

      <FieldError>{error}</FieldError>
    </TextField>
  );
}
