'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

interface Props {
  productId: string;
  initialNotes: string;
  readOnly?: boolean;
}

export default function ProductNotes({ productId, initialNotes, readOnly = false }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(true);

  const save = useCallback(async (html: string) => {
    if (readOnly) return;
    setSaving(true);
    await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productNotes: html }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [productId, readOnly]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-slate-100 hover:bg-slate-50 transition"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">상품확인정보</span>
          {!readOnly && saving && <span className="text-xs text-blue-400 animate-pulse">저장 중...</span>}
          {!readOnly && saved && <span className="text-xs text-emerald-500">저장됨</span>}
        </div>
        <span className="text-slate-400 text-xs">{open ? '▲ 접기' : '▼ 펼치기'}</span>
      </div>

      {open && (
        <div className="p-4">
          {readOnly ? (
            <div
              className="prose prose-sm max-w-none text-slate-700 min-h-[60px]"
              dangerouslySetInnerHTML={{ __html: notes || '<p class="text-slate-400">내용 없음</p>' }}
            />
          ) : (
            <RichTextEditor
              content={notes}
              onChange={setNotes}
              onBlur={save}
              readOnly={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
