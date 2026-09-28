import { useRef, useState } from 'react';
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Button, Spinner } from '@heroui/react';
import { TEXTOS_GESTION_AYUDA } from '../../lib/textos.js';

/**
 * Editor de texto enriquecido del manual (US-AYU-05): formato basico, listas,
 * titulos e imagenes ilustrativas.
 *
 * Las imagenes no viajan dentro del HTML como base64: el administrador elige un
 * archivo, `alSubirImagen` lo sube a Supabase Storage por URL firmada y el
 * editor inserta la URL publica. El saneamiento del servicio permite `img`.
 */
export function EditorDeContenidoAyuda({
  contenidoInicial,
  alCambiar,
  alSubirImagen,
}: {
  contenidoInicial: string;
  alCambiar: (html: string) => void;
  alSubirImagen: (archivo: File) => Promise<string>;
}) {
  const selectorArchivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: false }),
    ],
    content: contenidoInicial,
    immediatelyRender: false,
    onUpdate: ({ editor: instancia }) => {
      alCambiar(instancia.getHTML());
    },
  });

  async function alElegirArchivo(archivo: File | undefined) {
    if (!archivo || !editor) return;
    setError(null);
    setSubiendo(true);
    try {
      const url = await alSubirImagen(archivo);
      editor.chain().focus().setImage({ src: url, alt: archivo.name }).run();
    } catch {
      setError(TEXTOS_GESTION_AYUDA.errorImagen);
    } finally {
      setSubiendo(false);
    }
  }

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface focus-within:border-primary/50">
      <BarraDeHerramientas
        editor={editor}
        alInsertarImagen={() => {
          selectorArchivo.current?.click();
        }}
        subiendo={subiendo}
      />

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          evento.target.value = '';
          void alElegirArchivo(archivo);
        }}
        ref={selectorArchivo}
        type="file"
      />

      <EditorContent
        className="prose prose-sm min-h-[220px] max-w-none cursor-text px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none"
        editor={editor}
      />

      {error ? (
        <p
          className="border-t border-border px-3 py-2 text-caption text-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BarraDeHerramientas({
  editor,
  subiendo,
  alInsertarImagen,
}: {
  editor: Editor;
  subiendo: boolean;
  alInsertarImagen: () => void;
}) {
  useEditorState({
    editor,
    selector: (ctx) => ctx.transactionNumber,
  });

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background px-2 py-1.5">
      {BOTONES.map((boton) => (
        <Button
          aria-label={boton.ariaLabel}
          className={`size-8 min-w-8 px-0 text-label ${boton.clasesTexto ?? ''} ${
            boton.activo(editor)
              ? 'bg-primary/12 text-primary'
              : 'text-text-secondary'
          }`}
          isIconOnly
          key={boton.etiqueta}
          onMouseDown={(evento) => {
            evento.preventDefault();
          }}
          onPress={() => {
            boton.alPresionar(editor);
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          {boton.etiqueta}
        </Button>
      ))}

      <Button
        className="h-8 min-w-8 gap-1.5 px-2 text-label text-text-secondary"
        isDisabled={subiendo}
        onMouseDown={(evento) => {
          evento.preventDefault();
        }}
        onPress={alInsertarImagen}
        size="sm"
        type="button"
        variant="ghost"
      >
        {subiendo ? <Spinner className="size-4" /> : null}
        {subiendo
          ? TEXTOS_GESTION_AYUDA.subiendoImagen
          : TEXTOS_GESTION_AYUDA.insertarImagen}
      </Button>
    </div>
  );
}

const BOTONES: {
  etiqueta: string;
  ariaLabel: string;
  activo: (editor: Editor) => boolean;
  alPresionar: (editor: Editor) => void;
  clasesTexto?: string;
}[] = [
  {
    etiqueta: 'N',
    ariaLabel: 'Negrita',
    clasesTexto: 'font-bold',
    activo: (e) => e.isActive('bold'),
    alPresionar: (e) => {
      e.chain().focus().toggleBold().run();
    },
  },
  {
    etiqueta: 'I',
    ariaLabel: 'Cursiva',
    clasesTexto: 'italic',
    activo: (e) => e.isActive('italic'),
    alPresionar: (e) => {
      e.chain().focus().toggleItalic().run();
    },
  },
  {
    etiqueta: 'S',
    ariaLabel: 'Subrayado',
    clasesTexto: 'underline',
    activo: (e) => e.isActive('underline'),
    alPresionar: (e) => {
      e.chain().focus().toggleUnderline().run();
    },
  },
  {
    etiqueta: 'H2',
    ariaLabel: 'Título 2',
    activo: (e) => e.isActive('heading', { level: 2 }),
    alPresionar: (e) => {
      e.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    etiqueta: 'H3',
    ariaLabel: 'Título 3',
    activo: (e) => e.isActive('heading', { level: 3 }),
    alPresionar: (e) => {
      e.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    etiqueta: '•—',
    ariaLabel: 'Lista con viñetas',
    activo: (e) => e.isActive('bulletList'),
    alPresionar: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
  },
  {
    etiqueta: '1.',
    ariaLabel: 'Lista numerada',
    activo: (e) => e.isActive('orderedList'),
    alPresionar: (e) => {
      e.chain().focus().toggleOrderedList().run();
    },
  },
];
