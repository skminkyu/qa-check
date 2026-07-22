'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange?: (val: string) => void;
  onBlur?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
}

const COLORS = [
  { label: '기본', value: '' },
  { label: '빨강', value: '#dc2626' },
  { label: '주황', value: '#ea580c' },
  { label: '노랑', value: '#ca8a04' },
  { label: '초록', value: '#16a34a' },
  { label: '파랑', value: '#2563eb' },
  { label: '보라', value: '#9333ea' },
  { label: '회색', value: '#6b7280' },
];

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [showColors, setShowColors] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColors(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!editor) return null;

  const currentColor = editor.getAttributes('textStyle').color || '';

  function btn(active: boolean, onClick: () => void, children: React.ReactNode, title: string) {
    return (
      <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick(); }}
        className={`px-1.5 py-0.5 rounded text-xs font-medium transition ${active ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
        {children}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 px-1 py-0.5 border-b border-slate-100 flex-wrap">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <strong>B</strong>, '볼드')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <em>I</em>, '기울기')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <u>U</u>, '밑줄')}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <s>S</s>, '취소선')}
      <div className="relative" ref={colorRef}>
        <button type="button" title="글자색" onMouseDown={e => { e.preventDefault(); setShowColors(v => !v); }}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs text-slate-500 hover:bg-slate-100 transition">
          <span style={{ borderBottom: `3px solid ${currentColor || '#374151'}`, lineHeight: 1 }}>A</span>
          <span className="text-[10px]">▾</span>
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 z-50" style={{ width: 132 }}>
            {COLORS.map(c => (
              <button key={c.value} type="button" title={c.label}
                onMouseDown={e => {
                  e.preventDefault();
                  if (c.value) editor.chain().focus().setColor(c.value).run();
                  else editor.chain().focus().unsetColor().run();
                  setShowColors(false);
                }}
                className={`w-6 h-6 rounded border-2 transition ${currentColor === c.value ? 'border-slate-400' : 'border-transparent hover:border-slate-300'}`}
                style={{ backgroundColor: c.value || '#374151' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InlineEditor({ value, onChange, onBlur, placeholder, readOnly = false, rows = 3 }: Props) {
  const minHeight = `${rows * 1.6}rem`;
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: readOnly, autolink: true }),
      TextStyle,
      Color,
      Underline,
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
    onFocus: () => setFocused(true),
    onBlur: ({ editor }) => {
      setFocused(false);
      onBlur?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value]);

  if (!editor) return null;
  if (readOnly && !editor.getText().trim()) return null;

  return (
    <div className={`w-full text-xs rounded border transition ${
      readOnly
        ? 'border-transparent [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-1'
        : focused
          ? 'border-blue-300 ring-1 ring-blue-300 [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-1'
          : 'border-transparent [&_a]:text-blue-600 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-1'
    }`}>
      {!readOnly && focused && <Toolbar editor={editor} />}
      <div className="relative px-1 py-0.5">
        <EditorContent
          editor={editor}
          style={{ minHeight: readOnly ? undefined : minHeight }}
          className="text-slate-700 prose prose-xs max-w-none [&_s]:line-through [&_u]:underline"
        />
        {!focused && !editor.getText() && placeholder && !readOnly && (
          <div className="text-slate-300 text-xs pointer-events-none select-none absolute top-0.5 left-1">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
