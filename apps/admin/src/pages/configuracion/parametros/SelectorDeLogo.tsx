import { useRef, useState } from 'react';
import { Button, Label, Spinner } from '@heroui/react';
import {
  FORMATOS_IMAGEN_PERFIL,
  MAXIMO_IMAGEN_CATEGORIA_BYTES,
  MENSAJES_CONFIGURACION,
} from '@foodhub/shared';
import { subirLogoPlataforma } from '../../../lib/subirLogoPlataforma.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';

function esFormatoValido(archivo: File): boolean {
  return (FORMATOS_IMAGEN_PERFIL as readonly string[]).includes(archivo.type);
}

/**
 * Logo de la plataforma (US-CFG-03, RF057: máximo 2 MB). Mismo diseño que
 * `categorias/dialogos/SelectorDeImagen.tsx`: sube el archivo apenas se
 * elige, antes de confirmar "Guardar cambios".
 */
export function SelectorDeLogo({
  valor,
  alCambiar,
  error,
}: {
  valor: string | null;
  alCambiar: (url: string | null) => void;
  error?: string | undefined;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function alElegirArchivo(archivo: File | undefined) {
    if (!archivo) return;

    if (
      !esFormatoValido(archivo) ||
      archivo.size > MAXIMO_IMAGEN_CATEGORIA_BYTES
    ) {
      setErrorLocal(MENSAJES_CONFIGURACION.imagenCategoriaInvalida);
      return;
    }

    setErrorLocal(null);
    setSubiendo(true);
    try {
      alCambiar(await subirLogoPlataforma(archivo));
    } catch {
      setErrorLocal(MENSAJES_CONFIGURACION.imagenCategoriaInvalida);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{TEXTOS_PARAMETROS.campoLogo}</Label>

      {valor ? (
        <VistaPrevia
          alQuitar={() => {
            alCambiar(null);
          }}
          subiendo={subiendo}
          url={valor}
        />
      ) : (
        <BotonDeSubida
          alElegir={() => {
            inputRef.current?.click();
          }}
          subiendo={subiendo}
        />
      )}

      <input
        accept={FORMATOS_IMAGEN_PERFIL.join(',')}
        className="sr-only"
        onChange={(evento) => {
          void alElegirArchivo(evento.target.files?.[0]);
        }}
        ref={inputRef}
        type="file"
      />

      <MensajeDeError texto={error ?? errorLocal ?? undefined} />
    </div>
  );
}

function VistaPrevia({
  url,
  subiendo,
  alQuitar,
}: {
  url: string;
  subiendo: boolean;
  alQuitar: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        alt=""
        className="size-16 rounded-sm border border-border object-contain p-1"
        src={url}
      />
      <Button
        isDisabled={subiendo}
        onPress={alQuitar}
        size="sm"
        type="button"
        variant="tertiary"
      >
        {TEXTOS_PARAMETROS.logoQuitar}
      </Button>
    </div>
  );
}

function BotonDeSubida({
  subiendo,
  alElegir,
}: {
  subiendo: boolean;
  alElegir: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        isDisabled={subiendo}
        onPress={alElegir}
        size="sm"
        type="button"
        variant="secondary"
      >
        {subiendo ? <Spinner className="size-4" /> : null}
        {subiendo
          ? TEXTOS_PARAMETROS.logoSubiendo
          : TEXTOS_PARAMETROS.logoSeleccionar}
      </Button>
      <span className="text-caption text-text-secondary">
        {TEXTOS_PARAMETROS.logoAyuda}
      </span>
    </div>
  );
}

function MensajeDeError({ texto }: { texto: string | undefined }) {
  if (!texto) return null;
  return <p className="text-caption text-error">{texto}</p>;
}
