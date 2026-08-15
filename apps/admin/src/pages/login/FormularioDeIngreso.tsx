import type { FormEvent } from 'react';
import { Alert, FieldError, Input, Label, TextField } from '@heroui/react';
import { BotonDeEnvio } from '../../components/BotonDeEnvio.js';
import { CampoConIcono } from '../../components/CampoConIcono.js';
import { CampoDeContrasena } from '../../components/CampoDeContrasena.js';
import { IconoAlerta, IconoCorreo } from '../../components/iconos/index.js';
import { TEXTOS_LOGIN } from '../../lib/textos.js';

/** Errores por campo del formulario de ingreso. */
export type ErroresDeIngreso = Partial<Record<'email' | 'password', string>>;

/**
 * Formulario de PAN-AUT-03.
 *
 * Es puramente presentacional: no sabe qué es Supabase ni qué pasa después del
 * ingreso. Toda la lógica de autenticación vive en `Login`, y así este archivo
 * se puede mirar como lo que es —el formulario del mockup— sin leer nada más.
 *
 * El botón NO se deshabilita por formulario incompleto: US-AUT-03 no lo pide
 * (a diferencia del registro, US-AUT-01, donde sí es criterio) y esconder el
 * motivo del rechazo detrás de un botón muerto es peor que mostrarlo.
 */
export function FormularioDeIngreso({
  correo,
  contrasena,
  errores,
  errorGeneral,
  enviando,
  alCambiarCorreo,
  alCambiarContrasena,
  alEnviar,
}: {
  correo: string;
  contrasena: string;
  errores: ErroresDeIngreso;
  errorGeneral: string | null;
  enviando: boolean;
  alCambiarCorreo: (valor: string) => void;
  alCambiarContrasena: (valor: string) => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="space-y-5 rounded-lg border border-border bg-surface p-7"
      noValidate
      onSubmit={alEnviar}
    >
      {errorGeneral ? (
        <Alert status="danger">
          <Alert.Indicator>
            <IconoAlerta className="size-5" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{errorGeneral}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <TextField
        autoComplete="email"
        isInvalid={Boolean(errores.email)}
        name="email"
        onChange={alCambiarCorreo}
        type="email"
        value={correo}
      >
        <Label>{TEXTOS_LOGIN.correo}</Label>
        <CampoConIcono icono={<IconoCorreo className="size-4.5" />}>
          <Input
            className="w-full pl-10"
            placeholder={TEXTOS_LOGIN.correoPlaceholder}
          />
        </CampoConIcono>
        <FieldError>{errores.email}</FieldError>
      </TextField>

      <CampoDeContrasena
        alCambiar={alCambiarContrasena}
        autoComplete="current-password"
        error={errores.password}
        etiqueta={TEXTOS_LOGIN.contrasena}
        nombre="password"
        placeholder={TEXTOS_LOGIN.contrasenaPlaceholder}
        valor={contrasena}
      />

      <BotonDeEnvio enviando={enviando} textoEnviando={TEXTOS_LOGIN.ingresando}>
        {TEXTOS_LOGIN.ingresar}
      </BotonDeEnvio>

      <p className="text-center text-caption text-text-secondary">
        {TEXTOS_LOGIN.soloAdministradores}
      </p>
    </form>
  );
}
