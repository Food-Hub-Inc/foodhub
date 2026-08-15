import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Button,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import {
  IconoAlerta,
  IconoCandado,
  IconoCorreo,
  IconoOcultar,
  IconoVer,
} from '../../components/iconos/index.js';
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
        <ConAdorno adorno={<IconoCorreo className="size-4.5" />}>
          <Input
            className="w-full pl-10"
            placeholder={TEXTOS_LOGIN.correoPlaceholder}
          />
        </ConAdorno>
        <FieldError>{errores.email}</FieldError>
      </TextField>

      <CampoDeContrasena
        alCambiar={alCambiarContrasena}
        error={errores.password}
        valor={contrasena}
      />

      <Button fullWidth isDisabled={enviando} type="submit">
        {enviando ? <Spinner className="size-4" /> : null}
        {enviando ? TEXTOS_LOGIN.ingresando : TEXTOS_LOGIN.ingresar}
      </Button>

      <p className="text-center text-caption text-text-secondary">
        {TEXTOS_LOGIN.soloAdministradores}
      </p>
    </form>
  );
}

function CampoDeContrasena({
  valor,
  error,
  alCambiar,
}: {
  valor: string;
  error: string | undefined;
  alCambiar: (valor: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoComplete="current-password"
      isInvalid={Boolean(error)}
      name="password"
      onChange={alCambiar}
      // Cambiar el `type` es lo que muestra u oculta el valor. Se hace acá y no
      // con un CSS de por medio para que el gestor de contraseñas del navegador
      // siga reconociendo el campo.
      type={visible ? 'text' : 'password'}
      value={valor}
    >
      <Label>{TEXTOS_LOGIN.contrasena}</Label>
      <ConAdorno adorno={<IconoCandado className="size-4.5" />}>
        <Input
          className="w-full pr-11 pl-10"
          placeholder={TEXTOS_LOGIN.contrasenaPlaceholder}
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
      </ConAdorno>
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

/** Input con un ícono decorativo a la izquierda, como muestra la maquetación. */
function ConAdorno({
  adorno,
  children,
}: {
  adorno: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-disabled">
        {adorno}
      </span>
      {children}
    </div>
  );
}
