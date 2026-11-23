'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

// HTML을 블록 단위로 분리하되 인라인 서식(색상, 볼드 등) 태그는 보존
function parseNotesLines(html: string): { plain: string; rich: string }[] {
  const withNewlines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');
  const blockRemoved = withNewlines.replace(/<(p|div|ul|ol|li|h[1-6])[^>]*>/gi, '');

  return blockRemoved.split('\n')
    .map(chunk => {
      const rich = chunk.trim();
      if (!rich) return null;
      const plain = rich
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .trim();
      return plain ? { plain, rich } : null;
    })
    .filter((x): x is { plain: string; rich: string } => x !== null);
}

// rich HTML에서 첫 번째 콜론(HTML 태그 밖) 이후 부분 추출
function richAfterColon(rich: string): string {
  let inTag = false;
  for (let i = 0; i < rich.length; i++) {
    if (rich[i] === '<') { inTag = true; continue; }
    if (rich[i] === '>') { inTag = false; continue; }
    if (!inTag && (rich[i] === ':' || rich[i] === '：')) return rich.substring(i + 1).trimStart();
  }
  return rich;
}

type Row = { key: string; val: string; richVal: string };

function buildRows(lines: { plain: string; rich: string }[]): Row[] {
  const isNewItem = (l: string) => /^\d+\. /.test(l);
  const numberedKvRe = /^(\d+\. [^:：]+)[：:]\s*(.+)$/;
  const kvRe = /^([^:：]{1,25})[：:]\s*(.+)$/;
  const rows: Row[] = [];
  let current: Row | null = null;

  for (const { plain, rich } of lines) {
    if (/^■/.test(plain)) {
      // ■ 헤더 줄 — 현재 블록을 끊고 독립 행으로
      current = null;
      rows.push({ key: '', val: plain, richVal: rich });
    } else if (isNewItem(plain)) {
      const m = plain.match(numberedKvRe);
      if (m) {
        current = { key: m[1].trim(), val: m[2].trim(), richVal: richAfterColon(rich) };
      } else {
        current = { key: plain, val: '', richVal: '' };
      }
      rows.push(current);
    } else if (current !== null) {
      current.val = current.val ? current.val + '\n' + plain : plain;
      current.richVal = current.richVal ? current.richVal + '<br>' + rich : rich;
    } else {
      const m = plain.match(kvRe);
      if (m) rows.push({ key: m[1].trim(), val: m[2].trim(), richVal: richAfterColon(rich) });
      else rows.push({ key: '', val: plain, richVal: rich });
    }
  }
  return rows;
}

function ReadOnlyNotes({ html }: { html: string }) {
  const lines = parseNotesLines(html);
  if (!lines.length) return <p className="text-sm text-slate-400">내용 없음</p>;
  const rows = buildRows(lines);

  return (
    <table className="w-full text-sm" style={{ borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
      <tbody>
        {rows.map((row, i) => {
          const isHeader = row.key === '' && /^■/.test(row.val);
          return (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #e2e8f0' : undefined }}>
              {row.key ? (
                <>
                  <td style={{ padding: '7px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top', borderRight: '1px solid #e2e8f0', width: '160px', fontSize: '13px' }}>{row.key}</td>
                  <td
                    style={{ padding: '7px 12px', color: '#1e293b', lineHeight: 1.7, wordBreak: 'break-word', fontSize: '13px', verticalAlign: 'top' }}
                    dangerouslySetInnerHTML={{ __html: row.richVal }}
                  />
                </>
              ) : isHeader ? (
                <td
                  colSpan={2}
                  style={{ padding: '9px 14px', background: '#ffffff', color: '#1e293b', lineHeight: 1.5, fontSize: '14px', fontWeight: 700 }}
                  dangerouslySetInnerHTML={{ __html: row.richVal }}
                />
              ) : (
                <td
                  colSpan={2}
                  style={{ padding: '7px 12px', color: '#1e293b', lineHeight: 1.7, fontSize: '13px' }}
                  dangerouslySetInnerHTML={{ __html: row.richVal }}
                />
              )}
            </tr>
          );
        })}
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
