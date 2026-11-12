'use client';
import { useState } from 'react';

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
}

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

function buildHtml(productName: string, records: QARecord[]): string {
  const rows = records.map((r, i) => {
    const fg  = STATUS_COLOR[r.status] || '#334155';
    const bg  = STATUS_BG[r.status]   || '#f8fafc';
    const even = i % 2 === 1;
    const rowBg = even ? '#f8fafc' : '#ffffff';

    const cell = (content: string, extra = '') =>
      `<td style="border:1px solid #cbd5e1;padding:8px 12px;vertical-align:top;font-size:12px;font-family:Arial,sans-serif;${extra}">${content.replace(/\n/g, '<br>')}</td>`;

    return `<tr style="background:${rowBg}">
  ${cell(String(i + 1), 'color:#94a3b8;text-align:center;width:28px;')}
  ${cell(r.item_name, 'font-weight:600;color:#1e293b;width:160px;')}
  ${cell(`<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:${bg};color:${fg};">${r.status}</span>`, 'width:70px;')}
  ${cell(r.due_date || '', 'color:#64748b;width:90px;')}
  ${cell(r.qa_notes || '', 'color:#334155;')}
  ${cell(r.standard ? `<strong style="color:#1e3a8a;">${r.standard}</strong>` : '', 'color:#334155;width:200px;')}
  ${cell(r.standard_notes || '', 'color:#334155;')}
</tr>`;
  }).join('\n');

  const done = records.filter(r => r.status === '완료').length;
  const na   = records.filter(r => r.status === '해당없음').length;
  const eff  = records.length - na;
  const pct  = eff > 0 ? Math.round((done / eff) * 100) : 0;

  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;width:100%;min-width:800px;">
<thead>
  <tr>
    <td colspan="7" style="padding:10px 14px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">
      ${productName} &nbsp;·&nbsp; QA 체크리스트 &nbsp;&nbsp;
      <span style="font-size:12px;font-weight:400;color:#94a3b8;">${done}/${records.length} 완료 (${pct}%) &nbsp;|&nbsp; 기준 미완료 ${records.filter(r=>r.status==='미완료').length}건 &nbsp;|&nbsp; 보류 ${records.filter(r=>r.status==='보류').length}건</span>
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
${rows}
</tbody>
</table>`;
}

export default function ExportTableButton({ productName, records }: Props) {
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');

  async function copyTable() {
    try {
      const html = buildHtml(productName, records);
      const plain = records.map((r, i) =>
        `${i+1}\t${r.item_name}\t${r.status}\t${r.due_date||''}\t${r.qa_notes||''}\t${r.standard||''}\t${r.standard_notes||''}`
      ).join('\n');

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],  { type: 'text/html'  }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (status === 'done') return (
    <button disabled className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-600">
      ✓ 복사 완료 — 아웃룩에 붙여넣기
    </button>
  );
  if (status === 'error') return (
    <button disabled className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600">
      ✕ 복사 실패
    </button>
  );

  return (
    <button
      onClick={copyTable}
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
    >
      📊 도표 복사
    </button>
  );
}
