import { useState, type FormEvent } from 'react';
import { FieldError, Label, TextField, Input } from '@heroui/react';
import { Dialogo } from '../../../components/Dialogo.js';
import { PieDeFormulario } from './PieDeFormulario.js';

/** Ingreso de URL para el botón "Enlace" del editor enriquecido (US-CFG-04). */
export function DialogoDeEnlace({
  valorInicial,
  alConfirmar,
  alCerrar,
}: {
  valorInicial: string | undefined;
  alConfirmar: (url: string) => void;
  alCerrar: () => void;
}) {
  const [url, setUrl] = useState(valorInicial ?? '');
  const [error, setError] = useState<string | undefined>(undefined);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    try {
      new URL(url);
    } catch {
      setError('Ingresá una URL completa, con http:// o https://.');
      return;
    }
    setError(undefined);
    alConfirmar(url);
  }

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={enviar}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          enProceso={false}
          etiquetaConfirmar="Aplicar"
        />
      }
      titulo="Insertar enlace"
    >
      <TextField isInvalid={Boolean(error)} onChange={setUrl} value={url}>
        <Label>URL</Label>
        <Input autoFocus className="w-full" placeholder="https://" />
        <FieldError>{error}</FieldError>
      </TextField>
    </Dialogo>
  );
}
