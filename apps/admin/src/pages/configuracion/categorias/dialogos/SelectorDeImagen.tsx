import { useRef, useState } from 'react';
import { Button, Label, Spinner } from '@heroui/react';
import {
  FORMATOS_IMAGEN_PERFIL,
  MAXIMO_IMAGEN_CATEGORIA_BYTES,
  MENSAJES_CONFIGURACION,
} from '@foodhub/shared';
import { subirImagenCategoria } from '../../../../lib/subirImagenCategoria.js';
import { TEXTOS_CATEGORIAS } from '../../../../lib/textos.js';

function esFormatoValido(archivo: File): boolean {
  return (FORMATOS_IMAGEN_PERFIL as readonly string[]).includes(archivo.type);
}

/**
 * Imagen representativa de la categoría (US-CFG-01, RF054: máximo 2 MB,
 * opcional). Sube el archivo apenas se elige — no espera al "Guardar" del
 * formulario — para que el usuario vea la vista previa definitiva antes de
 * confirmar el alta o la edición.
 */
export function SelectorDeImagen({
  valor,
  categoriaId,
  alCambiar,
  error,
}: {
  valor: string | null;
  categoriaId: string | null;
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
      alCambiar(await subirImagenCategoria(archivo, categoriaId));
    } catch {
      setErrorLocal(MENSAJES_CONFIGURACION.imagenCategoriaInvalida);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{TEXTOS_CATEGORIAS.campoImagen}</Label>

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
        className="size-16 rounded-sm border border-border object-cover"
        src={url}
      />
      <Button
        isDisabled={subiendo}
        onPress={alQuitar}
        size="sm"
        type="button"
        variant="tertiary"
      >
        {TEXTOS_CATEGORIAS.imagenQuitar}
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
          ? TEXTOS_CATEGORIAS.imagenSubiendo
          : TEXTOS_CATEGORIAS.imagenSeleccionar}
      </Button>
      <span className="text-caption text-text-secondary">
        {TEXTOS_CATEGORIAS.imagenAyuda}
      </span>
    </div>
  );
}

function MensajeDeError({ texto }: { texto: string | undefined }) {
  if (!texto) return null;
  return <p className="text-caption text-error">{texto}</p>;
}
