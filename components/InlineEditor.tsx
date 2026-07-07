'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange?: (val: string) => void;
  onBlur?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
}

export default function InlineEditor({ value, onChange, onBlur, placeholder, readOnly = false, rows = 3 }: Props) {
  const minHeight = `${rows * 1.6}rem`;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: readOnly, autolink: true }),
    ],
    content: value || '',
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'focus:outline-none' },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = () => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src: reader.result as string })
                )
              );
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value]);

  if (!editor) return null;

  return (
    <div
      className={`w-full text-xs rounded px-1 py-0.5 ${
        readOnly
          ? '[&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-1'
          : 'focus-within:ring-1 focus-within:ring-blue-300 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-1'
      }`}
    >
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={`text-slate-700 prose prose-xs max-w-none ${!value && !editor.isFocused ? 'text-slate-300' : ''}`}
      />
      {!editor.isFocused && !editor.getText() && placeholder && (
        <div className="text-slate-300 text-xs pointer-events-none absolute" style={{ marginTop: `-${minHeight}` }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
