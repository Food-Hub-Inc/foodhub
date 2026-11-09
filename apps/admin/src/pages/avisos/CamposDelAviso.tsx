import {
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
} from '@heroui/react';
import {
  DESTINATARIO_AVISO,
  LARGO_MAXIMO_MENSAJE_AVISO,
  LARGO_MAXIMO_TITULO_AVISO,
  type AvisoGeneralInput,
  type DestinatarioAviso,
} from '@foodhub/shared';
import { TEXTOS_AVISOS as TEXTOS } from '../../lib/textos.js';
import type { ErroresPorCampo } from '../usuarios/dialogos/errores.js';

/**
 * Los tres datos que fija US-NOT-04: a quién va el aviso, su título y su
 * cuerpo. El destinatario se elige de una lista en prosa ("Solo clientes") y
 * no con el valor del enum: el vocabulario es el del usuario.
 */
export function CamposDelAviso({
  aviso,
  errores,
  alCambiar,
}: {
  aviso: AvisoGeneralInput;
  errores: ErroresPorCampo<keyof AvisoGeneralInput>;
  alCambiar: <C extends keyof AvisoGeneralInput>(
    campo: C,
    valor: AvisoGeneralInput[C],
  ) => void;
}) {
  return (
    <>
      <SelectorDeDestinatario
        alCambiar={(valor) => {
          alCambiar('destinatario', valor);
        }}
        error={errores.destinatario}
        valor={aviso.destinatario}
      />

      <TextField
        isInvalid={Boolean(errores.titulo)}
        isRequired
        maxLength={LARGO_MAXIMO_TITULO_AVISO}
        onChange={(valor) => {
          alCambiar('titulo', valor);
        }}
        value={aviso.titulo}
      >
        <Label>{TEXTOS.tituloAviso}</Label>
        <Input className="w-full" placeholder={TEXTOS.tituloPlaceholder} />
        <Description>
          {TEXTOS.caracteres(aviso.titulo.length, LARGO_MAXIMO_TITULO_AVISO)}
        </Description>
        <FieldError>{errores.titulo}</FieldError>
      </TextField>

      <TextField
        isInvalid={Boolean(errores.mensaje)}
        isRequired
        maxLength={LARGO_MAXIMO_MENSAJE_AVISO}
        onChange={(valor) => {
          alCambiar('mensaje', valor);
        }}
        value={aviso.mensaje}
      >
        <Label>{TEXTOS.mensaje}</Label>
        <TextArea
          className="w-full"
          placeholder={TEXTOS.mensajePlaceholder}
          rows={6}
        />
        <Description>
          {TEXTOS.caracteres(aviso.mensaje.length, LARGO_MAXIMO_MENSAJE_AVISO)}
        </Description>
        <FieldError>{errores.mensaje}</FieldError>
      </TextField>
    </>
  );
}

function SelectorDeDestinatario({
  valor,
  alCambiar,
  error,
}: {
  valor: DestinatarioAviso;
  alCambiar: (valor: DestinatarioAviso) => void;
  error?: string | undefined;
}) {
  return (
    <Select
      isInvalid={Boolean(error)}
      onSelectionChange={(clave) => {
        alCambiar(String(clave) as DestinatarioAviso);
      }}
      selectedKey={valor}
    >
      <Label>{TEXTOS.destinatario}</Label>
      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {DESTINATARIO_AVISO.map((destinatario) => (
            <ListBox.Item
              id={destinatario}
              key={destinatario}
              textValue={TEXTOS.destinatarios[destinatario]}
            >
              {TEXTOS.destinatarios[destinatario]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}
