import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, FieldError, Input, Label, TextField } from '@heroui/react';
import { BotonDeEnvio } from '../../components/BotonDeEnvio.js';
import { CampoConIcono } from '../../components/CampoConIcono.js';
import {
  IconoAlerta,
  IconoCorreo,
  IconoExito,
} from '../../components/iconos/index.js';
import { RUTAS } from '../../lib/rutas.js';
import { TEXTOS_RECUPERAR } from '../../lib/textos.js';

/**
 * Formulario del pedido de enlace de recuperación.
 *
 * Es puramente presentacional, igual que `FormularioDeIngreso`: no sabe qué es
 * la API ni qué pasa después de enviar. Los dos mensajes de resultado llegan ya
 * redactados desde el servidor —son literales de US-AUT-04— y este componente
 * solo elige con qué tono mostrarlos.
 *
 * El botón NO se deshabilita con el formulario incompleto, por el mismo criterio
 * que el ingreso: US-AUT-04 no lo pide y esconder el motivo del rechazo detrás
 * de un botón muerto es peor que mostrarlo.
 */
export function FormularioDeRecuperacion({
  correo,
  error,
  errorDeCampo,
  enviando,
  resultado,
  alCambiarCorreo,
  alEnviar,
}: {
  correo: string;
  error: string | null;
  errorDeCampo: string | undefined;
  enviando: boolean;
  resultado: string | null;
  alCambiarCorreo: (valor: string) => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="space-y-5 rounded-lg border border-border bg-surface p-7"
      noValidate
      onSubmit={alEnviar}
    >
      {resultado === null ? null : (
        <Alert status="success">
          <Alert.Indicator>
            <IconoExito className="size-5" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{resultado}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {error === null ? null : (
        <Alert status="danger">
          <Alert.Indicator>
            <IconoAlerta className="size-5" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <TextField
        autoComplete="email"
        isInvalid={Boolean(errorDeCampo)}
        name="email"
        onChange={alCambiarCorreo}
        type="email"
        value={correo}
      >
        <Label>{TEXTOS_RECUPERAR.correo}</Label>
        <CampoConIcono icono={<IconoCorreo className="size-4.5" />}>
          <Input
            className="w-full pl-10"
            placeholder={TEXTOS_RECUPERAR.correoPlaceholder}
          />
        </CampoConIcono>
        <FieldError>{errorDeCampo}</FieldError>
      </TextField>

      <BotonDeEnvio
        enviando={enviando}
        textoEnviando={TEXTOS_RECUPERAR.enviando}
      >
        {TEXTOS_RECUPERAR.enviar}
      </BotonDeEnvio>

      <p className="text-center">
        <Link
          className="text-body font-semibold text-primary hover:text-primary-dark"
          to={RUTAS.login}
        >
          {TEXTOS_RECUPERAR.volverAlIngreso}
        </Link>
      </p>
    </form>
  );
}
