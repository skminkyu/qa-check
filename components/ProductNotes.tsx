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


type Row = { key: string; val: string };

function buildRows(lines: string[]): Row[] {
  const kvRe = /^([^:：]{1,25})[：:]\s*(.+)$/;
  const isNewItem = (line: string) => /^\d+\. /.test(line);
  const rows: Row[] = [];
  for (const line of lines) {
    const m = line.match(kvRe);
    if (m) {
      rows.push({ key: m[1].trim(), val: m[2].trim() });
    } else {
      const last = rows[rows.length - 1];
      if (last && last.key !== '' && !isNewItem(line)) {
        last.val += '\n' + line;
      } else {
        rows.push({ key: '', val: line });
      }
    }
  }
  return rows;
}

function ReadOnlyNotes({ html }: { html: string }) {
  const lines = parseNotesHtml(html);
  if (!lines.length) return <p className="text-sm text-slate-400">내용 없음</p>;

  const rows = buildRows(lines);

  return (
    <table className="w-full text-sm" style={{ borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #e2e8f0' : undefined }}>
            {row.key ? (
              <>
                <td style={{ padding: '7px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top', borderRight: '1px solid #e2e8f0', width: '160px', fontSize: '13px' }}>{row.key}</td>
                <td style={{ padding: '7px 12px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.7, wordBreak: 'break-word', fontSize: '13px' }}>{row.val}</td>
              </>
            ) : (
              <td colSpan={2} style={{ padding: '7px 12px', color: '#334155', lineHeight: 1.7, fontSize: '13px' }}>{row.val}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
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
