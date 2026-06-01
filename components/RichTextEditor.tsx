'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback } from 'react';

interface Props {
  content: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
  readOnly?: boolean;
}

const COLORS = ['#000000', '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5', '#d53f8c'];

export default function RichTextEditor({ content, onChange, onBlur, readOnly = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className={`border border-slate-200 rounded-lg overflow-hidden ${readOnly ? '' : 'focus-within:ring-2 focus-within:ring-blue-300'}`}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
          {/* Bold */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-xs rounded font-bold transition ${editor.isActive('bold') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            B
          </button>
          {/* Italic */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-xs rounded italic transition ${editor.isActive('italic') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            I
          </button>
          {/* Underline */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`px-2 py-1 text-xs rounded underline transition ${editor.isActive('underline') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            U
          </button>
          {/* Strike */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 text-xs rounded line-through transition ${editor.isActive('strike') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            S
          </button>

          <div className="w-px h-4 bg-slate-300 mx-1" />

          {/* Bullet list */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-xs rounded transition ${editor.isActive('bulletList') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            • 목록
          </button>
          {/* Ordered list */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-xs rounded transition ${editor.isActive('orderedList') ? 'bg-slate-800 text-white' : 'hover:bg-slate-200 text-slate-700'}`}>
            1. 목록
          </button>

          <div className="w-px h-4 bg-slate-300 mx-1" />

          {/* Font color */}
          <div className="flex items-center gap-0.5">
            <span className="text-xs text-slate-500 mr-1">색상</span>
            {COLORS.map(color => (
              <button key={color} type="button"
                onClick={() => editor.chain().focus().setColor(color).run()}
                style={{ backgroundColor: color }}
                className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
                title={color}
              />
            ))}
          </div>

          <div className="w-px h-4 bg-slate-300 mx-1" />

          {/* Highlight */}
          <button type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            className={`px-2 py-1 text-xs rounded transition ${editor.isActive('highlight') ? 'bg-yellow-200' : 'hover:bg-slate-200 text-slate-700'}`}
            style={{ backgroundColor: editor.isActive('highlight') ? '#fef08a' : '' }}>
            형광펜
          </button>

          {/* Clear formatting */}
          <button type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            className="px-2 py-1 text-xs rounded hover:bg-slate-200 text-slate-500 transition ml-auto">
            초기화
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={`prose prose-sm max-w-none px-3 py-2 min-h-[120px] text-sm text-slate-800 focus:outline-none ${readOnly ? 'bg-slate-50' : 'bg-white'}`}
      />
    </div>
  );
}
