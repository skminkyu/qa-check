'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface QARecord {
  item_name: string;
  status: string;
  due_date?: string;
  qa_notes?: string;
  standard?: string;
  standard_notes?: string;
}

interface Props {
  productName: string;
  records: QARecord[];
  initialNotes?: string;
}

type Mode = 'all' | 'pending';
type CopyStatus = 'idle' | 'copying' | 'done' | 'error';

const STATUS_COLOR: Record<string, string> = {
  '완료':    '#065f46',
  '진행중':  '#1e40af',
  '보류':    '#92400e',
  '해당없음':'#64748b',
  '미완료':  '#991b1b',
};
const STATUS_BG: Record<string, string> = {
  '완료':    '#d1fae5',
  '진행중':  '#dbeafe',
  '보류':    '#fef3c7',
  '해당없음':'#f1f5f9',
  '미완료':  '#fee2e2',
};

// 인라인 서식(색상·볼드 등) 보존하면서 블록 단위로 분리
function parseNotesRich(html: string): { key: string; richVal: string }[] {
  const withNewlines = html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n').replace(/<\/li>/gi, '\n');
  const blockRemoved = withNewlines.replace(/<(p|div|ul|ol|li|h[1-6])[^>]*>/gi, '');

  const lines = blockRemoved.split('\n').map(chunk => {
    const rich = chunk.trim();
    if (!rich) return null;
    const plain = rich.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    return plain ? { plain, rich } : null;
  }).filter((x): x is { plain: string; rich: string } => x !== null);

  const isNewItem = (l: string) => /^\d+\. /.test(l);
  const numberedKvRe = /^(\d+\. [^:：]+)[：:]\s*(.+)$/;
  const kvRe = /^([^:：]{1,25})[：:]\s*(.+)$/;

  function richAfterColon(r: string): string {
    let inTag = false;
    for (let i = 0; i < r.length; i++) {
      if (r[i] === '<') { inTag = true; continue; }
      if (r[i] === '>') { inTag = false; continue; }
      if (!inTag && (r[i] === ':' || r[i] === '：')) return r.substring(i + 1).trimStart();
    }
    return r;
  }

  const rows: { key: string; richVal: string }[] = [];
  let current: { key: string; richVal: string } | null = null;

  for (const { plain, rich } of lines) {
    if (isNewItem(plain)) {
      const m = plain.match(numberedKvRe);
      current = m
        ? { key: m[1].trim(), richVal: richAfterColon(rich) }
        : { key: plain, richVal: '' };
      rows.push(current);
    } else if (current !== null) {
      current.richVal = current.richVal ? current.richVal + '<br>' + rich : rich;
    } else {
      const m = plain.match(kvRe);
      if (m) rows.push({ key: m[1].trim(), richVal: richAfterColon(rich) });
      else rows.push({ key: '', richVal: rich });
    }
  }
  return rows;
}

function buildNotesHtml(notesHtml: string): string {
  const rows = parseNotesRich(notesHtml);
  if (!rows.length) return '';

  const S = {
    border: 'border:1px solid #e2e8f0;',
    pad: 'padding:7px 12px;',
    font: 'font-size:13px;font-family:Arial,sans-serif;line-height:1.7;',
    top: 'vertical-align:top;',
  };

  const tableRows = rows.map(row => {
    const isHeader = row.key === '' && /^■/.test(row.richVal.replace(/<[^>]+>/g, ''));
    if (isHeader) {
      return `<tr><td colspan="2" style="${S.border}padding:9px 14px;font-size:14px;font-family:Arial,sans-serif;font-weight:700;background:#1e293b;color:#ffffff;line-height:1.5;">${row.richVal}</td></tr>`;
    }
    if (row.key) {
      return `<tr>
        <td style="${S.border}${S.pad}${S.font}${S.top}background:#f8fafc;color:#64748b;font-weight:600;white-space:nowrap;width:160px;">${row.key}</td>
        <td style="${S.border}${S.pad}${S.font}${S.top}color:#1e293b;">${row.richVal || '&nbsp;'}</td>
      </tr>`;
    }
    return `<tr><td colspan="2" style="${S.border}${S.pad}${S.font}color:#1e293b;">${row.richVal}</td></tr>`;
  }).join('');

  return `<br><table style="border-collapse:collapse;width:100%;min-width:820px;margin-top:8px;border:1px solid #e2e8f0;"><tbody>${tableRows}</tbody></table>`;
}

function buildHtml(productName: string, records: QARecord[], mode: Mode, notes?: string): string {
  const subset = mode === 'pending'
    ? records.filter(r => r.status === '미완료' || r.status === '진행중' || r.status === '보류')
    : records;

  const modeLabel = mode === 'pending' ? '미완료·진행중·보류 항목' : '전체 항목';
  const done  = records.filter(r => r.status === '완료').length;
  const na    = records.filter(r => r.status === '해당없음').length;
  const eff   = records.length - na;
  const pct   = eff > 0 ? Math.round((done / eff) * 100) : 0;
  const todo  = records.filter(r => r.status === '미완료').length;
  const prog  = records.filter(r => r.status === '진행중').length;
  const hold  = records.filter(r => r.status === '보류').length;

  const cell = (content: string, extra = '') =>
    `<td style="border:1px solid #cbd5e1;padding:8px 12px;vertical-align:top;font-size:12px;font-family:Arial,sans-serif;${extra}">${content.replace(/\n/g, '<br>')}</td>`;

  const rows = subset.map((r, i) => {
    const fg    = STATUS_COLOR[r.status] || '#334155';
    const bg    = STATUS_BG[r.status]   || '#f8fafc';
    const rowBg = i % 2 === 1 ? '#f8fafc' : '#ffffff';
    return `<tr style="background:${rowBg}">
  ${cell(String(i + 1), 'color:#94a3b8;text-align:center;width:28px;')}
  ${cell(r.item_name, 'font-weight:600;color:#1e293b;width:160px;')}
  ${cell(`<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${bg};color:${fg};">${r.status}</span>`, 'width:72px;')}
  ${cell(r.due_date || '', 'color:#64748b;width:92px;')}
  ${cell(r.qa_notes || '', 'color:#334155;')}
  ${cell(r.standard ? `<strong style="color:#1e3a8a;">${r.standard}</strong>` : '', 'color:#334155;width:200px;')}
  ${cell(r.standard_notes || '', 'color:#334155;')}
</tr>`;
  }).join('\n');

  const noRows = subset.length === 0
    ? `<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;font-family:Arial,sans-serif;">해당 항목이 없습니다.</td></tr>`
    : '';

  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;width:100%;min-width:820px;">
<thead>
  <tr>
    <td colspan="7" style="padding:10px 14px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">
      ${productName} &nbsp;·&nbsp; QA 체크리스트 (${modeLabel}) &nbsp;&nbsp;
      <span style="font-size:11px;font-weight:400;color:#94a3b8;">${done}/${records.length} 완료 (${pct}%) &nbsp;|&nbsp; 미완료 ${todo}건 &nbsp;|&nbsp; 진행중 ${prog}건 &nbsp;|&nbsp; 보류 ${hold}건</span>
    </td>
  </tr>
  <tr style="background:#1e293b;">
    <th style="border:1px solid #334155;padding:8px 12px;text-align:center;color:#94a3b8;font-size:11px;font-family:Arial,sans-serif;width:28px;">#</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">QA 항목</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">상태</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">완료 예정일</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">QA 확인 사항</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">기준</th>
    <th style="border:1px solid #334155;padding:8px 12px;text-align:left;color:#e2e8f0;font-size:11px;font-family:Arial,sans-serif;">QA 의견</th>
  </tr>
</thead>
<tbody>
${noRows || rows}
</tbody>
</table>${notes ? buildNotesHtml(notes) : ''}`;
}

export default function ExportTableButton({ productName, records, initialNotes }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [copiedMode, setCopiedMode] = useState<Mode | null>(null);
  const [mounted, setMounted] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const pendingCount = records.filter(r =>
    r.status === '미완료' || r.status === '진행중' || r.status === '보류'
  ).length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false);
    }
    if (showModal) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  async function copy(mode: Mode) {
    setCopyStatus('copying');
    try {
      const html  = buildHtml(productName, records, mode, includeNotes ? (initialNotes || '') : undefined);
      const subset = mode === 'pending'
        ? records.filter(r => r.status === '미완료' || r.status === '진행중' || r.status === '보류')
        : records;
      const plain = subset.map((r, i) =>
        `${i+1}\t${r.item_name}\t${r.status}\t${r.due_date||''}\t${r.qa_notes||''}\t${r.standard||''}\t${r.standard_notes||''}`
      ).join('\n');

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],  { type: 'text/html'  }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      setCopiedMode(mode);
      setCopyStatus('done');
      setTimeout(() => {
        setCopyStatus('idle');
        setCopiedMode(null);
        setShowModal(false);
      }, 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
      >
        📊 도표 복사
      </button>

      {/* Modal — portal to document.body to escape sticky topbar stacking context */}
      {showModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          style={{ paddingTop: '72px', paddingBottom: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-auto"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">도표 복사</h2>
                  <p className="text-xs text-slate-400 mt-0.5">아웃룩에 바로 붙여넣기 가능한 표</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-300 hover:text-slate-500 transition text-lg leading-none"
                >✕</button>
              </div>
            </div>

            {/* Options */}
            <div className="px-6 py-5 flex flex-col gap-3">
              {/* 전체 항목 */}
              <button
                onClick={() => copy('all')}
                disabled={copyStatus === 'copying'}
                className="group relative w-full text-left border rounded-xl px-4 py-4 transition hover:border-blue-400 hover:bg-blue-50/50 border-slate-200 disabled:opacity-60"
              >
                {copiedMode === 'all' && copyStatus === 'done' ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <span className="text-lg">✓</span>
                    <div>
                      <div className="text-sm font-bold">복사 완료!</div>
                      <div className="text-xs">아웃룩에 Ctrl+V 로 붙여넣기</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📋</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800">전체 항목</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          완료·진행중·미완료·해당없음 포함 · 총 {records.length}개
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                        {copyStatus === 'copying' && copiedMode !== 'pending' ? '복사 중…' : '클릭하여 복사'}
                      </span>
                    </div>
                  </>
                )}
              </button>

              {/* 상품확인정보 포함 토글 */}
              <div
                className="flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-50 transition"
                onClick={() => setIncludeNotes(v => !v)}
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">상품확인정보 포함</div>
                  <div className="text-xs text-slate-400">표 아래 상품확인정보 표 추가</div>
                </div>
                <div className={`relative w-10 h-6 rounded-full transition-colors ${includeNotes ? 'bg-violet-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${includeNotes ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              {/* 미완료·진행중 항목만 */}
              <button
                onClick={() => copy('pending')}
                disabled={copyStatus === 'copying'}
                className="group relative w-full text-left border rounded-xl px-4 py-4 transition hover:border-amber-400 hover:bg-amber-50/50 border-slate-200 disabled:opacity-60"
              >
                {copiedMode === 'pending' && copyStatus === 'done' ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <span className="text-lg">✓</span>
                    <div>
                      <div className="text-sm font-bold">복사 완료!</div>
                      <div className="text-xs">아웃룩에 Ctrl+V 로 붙여넣기</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">미완료 · 진행중 · 보류만</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        처리 필요 항목만 추출 ·{' '}
                        <span className={pendingCount > 0 ? 'text-amber-600 font-semibold' : ''}>
                          {pendingCount}개
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition shrink-0">
                      {copyStatus === 'copying' && copiedMode === 'pending' ? '복사 중…' : '클릭하여 복사'}
                    </span>
                  </div>
                )}
              </button>

              {copyStatus === 'error' && (
                <p className="text-xs text-red-500 text-center">
                  복사 실패 — 브라우저 권한을 확인해 주세요.
                </p>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-6 pb-5">
              <p className="text-xs text-slate-300 text-center">
                복사 후 아웃룩 메일 작성창에서 Ctrl+V
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
