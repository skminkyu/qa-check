'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

function parseNotesHtml(html: string): string[] {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

type NoteSeg = { type: 'kv'; pairs: { key: string; val: string }[] } | { type: 'text'; line: string };

function ReadOnlyNotes({ html }: { html: string }) {
  const lines = parseNotesHtml(html);
  if (!lines.length) return <p className="text-sm text-slate-400">내용 없음</p>;

  const kvRe = /^([^:：]{1,20})[：:]\s*(.+)$/;
  const segs: NoteSeg[] = [];

  for (const line of lines) {
    const m = line.match(kvRe);
    if (m) {
      const last = segs[segs.length - 1];
      if (last?.type === 'kv') last.pairs.push({ key: m[1].trim(), val: m[2].trim() });
      else segs.push({ type: 'kv', pairs: [{ key: m[1].trim(), val: m[2].trim() }] });
    } else {
      segs.push({ type: 'text', line });
    }
  }

  return (
    <div className="space-y-2">
      {segs.map((seg, i) =>
        seg.type === 'kv' ? (
          <div key={i} className="grid grid-cols-[auto_1fr] border border-slate-200 rounded-lg overflow-hidden text-sm">
            {seg.pairs.flatMap((p, j) => [
              <span key={`k${j}`} className={`px-3 py-2 bg-slate-50 text-slate-500 font-medium whitespace-nowrap${j < seg.pairs.length - 1 ? ' border-b border-slate-100' : ''}`}>{p.key}</span>,
              <span key={`v${j}`} className={`px-3 py-2 text-slate-700${j < seg.pairs.length - 1 ? ' border-b border-slate-100' : ''}`}>{p.val}</span>,
            ])}
          </div>
        ) : (
          <p key={i} className="text-sm text-slate-700 leading-relaxed">{seg.line}</p>
        )
      )}
    </div>
  );
}

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
            <div className="min-h-[40px]">
              <ReadOnlyNotes html={notes || ''} />
            </div>
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
