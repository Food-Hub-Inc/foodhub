import { useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@heroui/react';
import { DialogoDeEnlace } from './DialogoDeEnlace.js';

/**
 * Editor de texto enriquecido de US-CFG-04 (RF058): negrita, cursiva,
 * subrayado, listas, títulos H1 a H3 y enlaces. `StarterKit` de TipTap v3
 * ya incluye subrayado y enlaces (antes eran extensiones aparte); se
 * configuran acá en lugar de agregarlos de nuevo, que duplicaría la
 * extensión.
 */
export function EditorEnriquecido({
  contenidoInicial,
  alCambiar,
}: {
  contenidoInicial: string;
  alCambiar: (html: string) => void;
}) {
  const [dialogoEnlaceAbierto, setDialogoEnlaceAbierto] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: contenidoInicial,
    // Evita el warning de hidratación de TipTap en React 19 (recomendación oficial).
    immediatelyRender: false,
    onUpdate: ({ editor: instancia }) => {
      alCambiar(instancia.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <BarraDeHerramientas
        editor={editor}
        alAbrirEnlace={() => {
          setDialogoEnlaceAbierto(true);
        }}
      />

      <EditorContent
        className="prose prose-sm min-h-[280px] max-w-none px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:outline-none"
        editor={editor}
      />

      {dialogoEnlaceAbierto ? (
        <DialogoDeEnlace
          alCerrar={() => {
            setDialogoEnlaceAbierto(false);
          }}
          alConfirmar={(url) => {
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run();
            setDialogoEnlaceAbierto(false);
          }}
          valorInicial={editor.getAttributes('link').href as string | undefined}
        />
      ) : null}
    </div>
  );
}

const BOTONES_TEXTO: {
  etiqueta: string;
  activo: (editor: Editor) => boolean;
  alPresionar: (editor: Editor) => void;
  clasesTexto?: string;
}[] = [
  {
    etiqueta: 'N',
    clasesTexto: 'font-bold',
    activo: (e) => e.isActive('bold'),
    alPresionar: (e) => {
      e.chain().focus().toggleBold().run();
    },
  },
  {
    etiqueta: 'I',
    clasesTexto: 'italic',
    activo: (e) => e.isActive('italic'),
    alPresionar: (e) => {
      e.chain().focus().toggleItalic().run();
    },
  },
  {
    etiqueta: 'S',
    clasesTexto: 'underline',
    activo: (e) => e.isActive('underline'),
    alPresionar: (e) => {
      e.chain().focus().toggleUnderline().run();
    },
  },
  {
    etiqueta: 'H1',
    activo: (e) => e.isActive('heading', { level: 1 }),
    alPresionar: (e) => {
      e.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    etiqueta: 'H2',
    activo: (e) => e.isActive('heading', { level: 2 }),
    alPresionar: (e) => {
      e.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    etiqueta: 'H3',
    activo: (e) => e.isActive('heading', { level: 3 }),
    alPresionar: (e) => {
      e.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    etiqueta: '•—',
    activo: (e) => e.isActive('bulletList'),
    alPresionar: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
  },
  {
    etiqueta: '1.',
    activo: (e) => e.isActive('orderedList'),
    alPresionar: (e) => {
      e.chain().focus().toggleOrderedList().run();
    },
  },
];

function BarraDeHerramientas({
  editor,
  alAbrirEnlace,
}: {
  editor: Editor;
  alAbrirEnlace: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background px-2 py-1.5">
      {BOTONES_TEXTO.map((boton) => (
        <Button
          className={`size-8 min-w-8 px-0 text-label ${boton.clasesTexto ?? ''} ${
            boton.activo(editor)
              ? 'bg-primary/12 text-primary'
              : 'text-text-secondary'
          }`}
          isIconOnly
          key={boton.etiqueta}
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
        className={`h-8 min-w-8 px-2 text-label ${
          editor.isActive('link')
            ? 'bg-primary/12 text-primary'
            : 'text-text-secondary'
        }`}
        onPress={alAbrirEnlace}
        size="sm"
        type="button"
        variant="ghost"
      >
        Enlace
      </Button>
    </div>
  );
}
