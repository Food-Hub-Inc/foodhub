import { useId, type FormEvent } from 'react';
import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
} from '@heroui/react';
import {
  ETIQUETAS_ROL_DESTINO_AYUDA,
  MENSAJES_AYUDA,
  ROL_DESTINO_AYUDA,
  categoriasFaqDeRol,
  type RolDestinoAyuda,
} from '@foodhub/shared';
import { Dialogo } from '../../../components/Dialogo.js';
import {
  TEXTOS_FORMULARIO,
  TEXTOS_GESTION_AYUDA,
} from '../../../lib/textos.js';

/**
 * Controles compartidos por los formularios de US-AYU-05. Se agrupan acá para
 * no repetir el mismo campo en el alta y la edición del manual y de las FAQ.
 */

export function CampoDeTexto({
  etiqueta,
  valor,
  alCambiar,
  error,
  autoFocus = false,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  autoFocus?: boolean;
}) {
  return (
    <TextField isInvalid={Boolean(error)} onChange={alCambiar} value={valor}>
      <Label>{etiqueta}</Label>
      <Input autoFocus={autoFocus} className="w-full" />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}

/**
 * Área de texto multilínea. HeroUI no expone un `TextArea`, así que se dibuja
 * sobre un `<textarea>` nativo con los tokens de la guía.
 */
export function CampoDeArea({
  etiqueta,
  valor,
  alCambiar,
  error,
  placeholder,
  maxLength,
  filas = 6,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  placeholder?: string;
  maxLength?: number;
  filas?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label
        className="text-label font-semibold text-text-primary"
        htmlFor={id}
      >
        {etiqueta}
      </label>
      <textarea
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="w-full resize-y rounded-sm border border-border bg-surface px-3 py-2 text-body text-text-primary outline-none placeholder:text-text-disabled focus:border-primary/50"
        id={id}
        maxLength={maxLength}
        onChange={(evento) => {
          alCambiar(evento.target.value);
        }}
        placeholder={placeholder}
        rows={filas}
        value={valor}
      />
      {error ? (
        <p className="text-caption text-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PieDeFormulario({
  etiquetaConfirmar,
  enProceso,
  alCancelar,
  destructivo = false,
}: {
  etiquetaConfirmar: string;
  enProceso: boolean;
  alCancelar: () => void;
  destructivo?: boolean;
}) {
  return (
    <>
      <Button
        isDisabled={enProceso}
        onPress={alCancelar}
        type="button"
        variant="tertiary"
      >
        {TEXTOS_FORMULARIO.cancelar}
      </Button>

      <Button
        isDisabled={enProceso}
        type="submit"
        variant={destructivo ? 'danger' : 'primary'}
      >
        {enProceso ? <Spinner className="size-4" /> : null}
        {enProceso ? TEXTOS_FORMULARIO.guardando : etiquetaConfirmar}
      </Button>
    </>
  );
}

/** Selector del rol destinatario (Cliente / Cocinero / Ambos). */
export function SelectorDeRolDestino({
  valor,
  alCambiar,
  error,
}: {
  valor: RolDestinoAyuda | null;
  alCambiar: (valor: RolDestinoAyuda) => void;
  error?: string | undefined;
}) {
  return (
    <Select
      isInvalid={Boolean(error)}
      onSelectionChange={(clave) => {
        alCambiar(String(clave) as RolDestinoAyuda);
      }}
      selectedKey={valor}
    >
      <Label>{MENSAJES_AYUDA.admin.rolCampo}</Label>
      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {ROL_DESTINO_AYUDA.map((codigo) => (
            <ListBox.Item
              id={codigo}
              key={codigo}
              textValue={ETIQUETAS_ROL_DESTINO_AYUDA[codigo]}
            >
              {ETIQUETAS_ROL_DESTINO_AYUDA[codigo]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}

/**
 * Selector de categoría de FAQ: las opciones dependen del rol destinatario.
 * Con "Ambos" (o sin rol elegido) se ofrece la unión de las dos listas.
 */
export function SelectorDeCategoriaFaq({
  rol,
  valor,
  alCambiar,
  error,
}: {
  rol: RolDestinoAyuda | null;
  valor: string | null;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
}) {
  const opciones = categoriasFaqDeRol(rol ?? 'AMBOS');
  return (
    <Select
      isInvalid={Boolean(error)}
      onSelectionChange={(clave) => {
        alCambiar(String(clave));
      }}
      selectedKey={valor}
    >
      <Label>{MENSAJES_AYUDA.admin.categoriaCampo}</Label>
      <Select.Trigger className="w-full justify-between border border-border bg-surface">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {opciones.map((categoria) => (
            <ListBox.Item id={categoria} key={categoria} textValue={categoria}>
              {categoria}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{error}</FieldError>
    </Select>
  );
}

/**
 * Diálogo de confirmación de baja lógica. El texto es el literal de US-AYU-05:
 * "¿Deshabilitar este contenido? Dejará de ser visible para los usuarios pero
 * permanecerá en el sistema."
 */
export function DialogoDeDeshabilitar({
  nombre,
  enProceso,
  error,
  alConfirmar,
  alCerrar,
}: {
  nombre: string;
  enProceso: boolean;
  error: string | null;
  alConfirmar: () => void;
  alCerrar: () => void;
}) {
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alConfirmar();
  }

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={enviar}
      error={error}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          destructivo
          enProceso={enProceso}
          etiquetaConfirmar={MENSAJES_AYUDA.admin.deshabilitar}
        />
      }
      titulo={TEXTOS_GESTION_AYUDA.dialogoDeshabilitarTitulo}
    >
      <p className="text-body text-text-secondary">
        <span className="font-semibold text-text-primary">{nombre}</span>
      </p>

      <p className="rounded-sm bg-error/8 p-3 text-body text-text-secondary">
        {MENSAJES_AYUDA.admin.confirmarDeshabilitar}
      </p>
    </Dialogo>
  );
}
