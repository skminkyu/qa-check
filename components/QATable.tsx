'use client';
import { useState, useCallback } from 'react';

const STATUSES = ['미완료', '진행중', '완료', '해당없음', '보류'];

const STATUS_STYLE: Record<string, string> = {
  '완료': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '진행중': 'bg-blue-100 text-blue-800 border-blue-200',
  '보류': 'bg-amber-100 text-amber-800 border-amber-200',
  '해당없음': 'bg-gray-100 text-gray-500 border-gray-200',
  '미완료': 'bg-slate-100 text-slate-600 border-slate-200',
};

export interface QARecord {
  id?: string;
  template_id: string;
  item_name: string;
  standard?: string;
  file_url?: string;
  sort_order: number;
  status: string;
  qa_notes?: string;
  standard_notes?: string;
  due_date?: string;
  updated_at?: string;
  product_id?: string;
}

interface Props {
  productId: string;
  initialRecords: QARecord[];
  readOnly?: boolean;
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>
      : <span key={i}>{part}</span>
  );
}

export default function QATable({ productId, initialRecords, readOnly = false }: Props) {
  const [records, setRecords] = useState<QARecord[]>(
    initialRecords.map(r => ({ ...r, status: r.status || '미완료' }))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const save = useCallback(async (record: QARecord) => {
    if (readOnly) return;
    setSaving(record.template_id);
    const res = await fetch('/api/qa-records', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        templateId: record.template_id,
        status: record.status,
        qaNotes: record.qa_notes,
        standardNotes: record.standard_notes,
        dueDate: record.due_date || null,
      }),
    });
    if (res.ok) {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setRecords(prev => prev.map(r => r.template_id === record.template_id ? { ...r, updated_at: now } : r));
    }
    setSaving(null);
  }, [productId, readOnly]);

  function updateRecord(templateId: string, patch: Partial<QARecord>) {
    setRecords(prev => prev.map(r => r.template_id === templateId ? { ...r, ...patch } : r));
  }

  const done = records.filter(r => r.status === '완료').length;
  const na = records.filter(r => r.status === '해당없음').length;
  const effective = records.length - na;
  const pct = effective > 0 ? Math.round((done / effective) * 100) : 0;

  return (
    <div>
      {/* Progress summary */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1 bg-slate-200 rounded-full h-3">
          <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-semibold text-slate-700">{done}/{records.length} 완료 ({pct}%)</span>
        <div className="flex gap-2 text-xs">
          {STATUSES.map(s => {
            const cnt = records.filter(r => r.status === s).length;
            if (cnt === 0) return null;
            return <span key={s} className={`px-2 py-0.5 rounded-full border ${STATUS_STYLE[s]}`}>{s} {cnt}</span>;
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '2.5rem' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '7rem' }} />
          </colgroup>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">#</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">QA 항목</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">상태</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">완료 예정일</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">QA 확인 사항</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600">기준 및 QA 의견</th>
              <th className="text-left px-3 py-3 font-semibold text-slate-600 text-xs">수정 시간</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.template_id} className="border-b border-slate-100 hover:bg-slate-50 transition align-top">
                <td className="px-3 py-3 text-slate-400 text-xs">{i + 1}</td>
                <td className="px-3 py-3 font-medium text-slate-800 text-xs leading-snug">{r.item_name}</td>

                {/* 상태 */}
                <td className="px-3 py-3">
                  {readOnly ? (
                    <span className={`px-2 py-1 rounded-full border text-xs font-medium ${STATUS_STYLE[r.status || '미완료']}`}>
                      {r.status || '미완료'}
                    </span>
                  ) : (
                    <select
                      value={r.status || '미완료'}
                      onChange={e => {
                        const updated = { ...r, status: e.target.value };
                        updateRecord(r.template_id, { status: e.target.value });
                        save(updated);
                      }}
                      className={`text-xs font-medium px-1.5 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer w-full ${STATUS_STYLE[r.status || '미완료']}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>

                {/* 완료 예정일 */}
                <td className="px-3 py-3">
                  {readOnly ? (
                    <span className="text-xs text-slate-600">{r.due_date || ''}</span>
                  ) : (
                    <input
                      type="date"
                      value={r.due_date || ''}
                      onChange={e => updateRecord(r.template_id, { due_date: e.target.value })}
                      onBlur={() => save(r)}
                      className="text-xs border border-slate-200 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-300 text-slate-700 bg-transparent"
                    />
                  )}
                </td>

                {/* QA 확인 사항 */}
                <td className="px-3 py-3">
                  {readOnly ? (
                    <div className="text-slate-600 text-xs whitespace-pre-wrap">{renderTextWithLinks(r.qa_notes || '')}</div>
                  ) : (
                    <textarea
                      value={r.qa_notes || ''}
                      onChange={e => updateRecord(r.template_id, { qa_notes: e.target.value })}
                      onBlur={() => save(r)}
                      rows={3}
                      placeholder="확인 내용 입력..."
                      className="w-full text-xs border-0 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-slate-700 placeholder-slate-300"
                    />
                  )}
                </td>

                {/* 기준 및 QA 의견 */}
                <td className="px-3 py-3">
                  {r.standard && (
                    <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1.5 whitespace-pre-wrap">{r.standard}</div>
                  )}
                  {r.file_url && (
                    <a href={r.file_url} download className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mb-1.5 transition">
                      ⬇ {r.file_url.split('/').pop()}
                    </a>
                  )}
                  {readOnly ? (
                    <div className="text-slate-600 text-xs whitespace-pre-wrap">{renderTextWithLinks(r.standard_notes || '')}</div>
                  ) : (
                    <textarea
                      value={r.standard_notes || ''}
                      onChange={e => updateRecord(r.template_id, { standard_notes: e.target.value })}
                      onBlur={() => save(r)}
                      rows={3}
                      placeholder="기준/의견 입력..."
                      className="w-full text-xs border-0 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-slate-700 placeholder-slate-300"
                    />
                  )}
                </td>

                {/* 수정 시간 */}
                <td className="px-3 py-3">
                  {saving === r.template_id ? (
                    <span className="text-xs text-blue-400 animate-pulse">저장중...</span>
                  ) : r.updated_at ? (
                    <span className="text-xs text-slate-400">{r.updated_at.slice(0, 16).replace('T', ' ')}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
