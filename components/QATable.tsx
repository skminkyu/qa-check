'use client';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const InlineEditor = dynamic(() => import('./InlineEditor'), { ssr: false });

const STATUSES = ['미완료', '진행중', '완료', '해당없음', '보류'];

const STATUS_STYLE: Record<string, string> = {
  '완료':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  '진행중':  'bg-blue-50 text-blue-600 border-blue-200',
  '보류':    'bg-amber-50 text-amber-600 border-amber-200',
  '해당없음':'bg-slate-100 text-slate-400 border-slate-200',
  '미완료':  'bg-red-50 text-red-500 border-red-200',
};

function toKST(utcStr: string): string {
  if (!utcStr) return '';
  // SQLite stores UTC without Z; add Z so Date parses correctly
  const d = new Date(utcStr.includes('T') ? utcStr : utcStr.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return utcStr.slice(0, 16);
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(/\. /g, '-').replace('.', '').replace(',', '');
}

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
  priority?: number;
}

interface Props {
  productId: string;
  initialRecords: QARecord[];
  readOnly?: boolean;
}

export default function QATable({ productId, initialRecords, readOnly = false }: Props) {
  const [records, setRecords] = useState<QARecord[]>(
    initialRecords.map(r => ({ ...r, status: r.status || '미완료', priority: r.priority ?? 0 }))
  );
  const recordsRef = useRef<QARecord[]>([]);
  recordsRef.current = records;

  const [saving, setSaving] = useState<string | null>(null);
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [dueDateSort, setDueDateSort] = useState<'asc' | 'desc' | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const save = useCallback(async (templateId: string, overrides?: Partial<QARecord>) => {
    if (readOnly) return;
    const base = recordsRef.current.find(r => r.template_id === templateId);
    if (!base) return;
    const record = overrides ? { ...base, ...overrides } : base;
    setSaving(templateId);
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
        priority: record.priority ?? 0,
      }),
    });
    if (res.ok) {
      // updated_at from server is UTC; we display it as KST via toKST()
      const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
      setRecords(prev => prev.map(r => r.template_id === templateId ? { ...r, updated_at: nowUtc } : r));
    }
    setSaving(null);
  }, [productId, readOnly]);

  function updateRecord(templateId: string, patch: Partial<QARecord>) {
    setRecords(prev => prev.map(r => r.template_id === templateId ? { ...r, ...patch } : r));
  }

  async function togglePriority(templateId: string) {
    if (readOnly) return;
    const rec = recordsRef.current.find(r => r.template_id === templateId);
    if (!rec) return;
    const newPriority = rec.priority ? 0 : 1;
    updateRecord(templateId, { priority: newPriority });
    await save(templateId, { priority: newPriority });
  }

  // Stats
  const done  = records.filter(r => r.status === '완료').length;
  const na    = records.filter(r => r.status === '해당없음').length;
  const todo  = records.filter(r => r.status === '미완료').length;
  const prog  = records.filter(r => r.status === '진행중').length;
  const hold  = records.filter(r => r.status === '보류').length;
  const prio  = records.filter(r => r.priority).length;
  const effective = records.length - na;
  const pct = effective > 0 ? Math.round((done / effective) * 100) : 0;

  const displayed = useMemo(() => {
    let list = filterStatuses.size > 0
      ? records.filter(r => filterStatuses.has(r.status))
      : [...records];
    // Priority items always first
    list.sort((a, b) => {
      const pa = a.priority ? 1 : 0;
      const pb = b.priority ? 1 : 0;
      if (pa !== pb) return pb - pa;
      if (dueDateSort) {
        const da = a.due_date || '';
        const db = b.due_date || '';
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return dueDateSort === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      }
      return a.sort_order - b.sort_order;
    });
    return list;
  }, [records, filterStatuses, dueDateSort]);

  function toggleDueDateSort() {
    setDueDateSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
  }

  function toggleStatusFilter(s: string) {
    setFilterStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  const priorityItems = displayed.filter(r => r.priority);

  async function generateAiSummary() {
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);
    try {
      const res = await fetch(`/api/products/${productId}/ai-summary`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '요약 생성 실패');
      setAiSummary(data.summary);
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      {/* ── 진행 현황 요약 카드 ── */}
      <div className="mb-4">
        <button
          onClick={() => setShowSummary(v => !v)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              진행 현황 요약
              <span className="text-slate-300 text-[10px]">{showSummary ? '▲' : '▼'}</span>
            </span>
            <span className="text-xs font-bold text-slate-700">{done}/{records.length} 완료 ({pct}%)</span>
          </div>
        </button>

        {/* Progress bar */}
        <div className="bg-slate-100 rounded-full h-2 mb-3">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {showSummary && (
          <div className="space-y-3">
            {/* 상태별 요약 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: '미완료', count: todo, color: 'bg-red-50 border-red-200 text-red-600' },
                { label: '진행중', count: prog, color: 'bg-blue-50 border-blue-200 text-blue-600' },
                { label: '보류',   count: hold, color: 'bg-amber-50 border-amber-200 text-amber-600' },
                { label: '완료',   count: done, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { label: '해당없음', count: na, color: 'bg-slate-50 border-slate-200 text-slate-500' },
              ].map(({ label, count, color }) => (
                <button
                  key={label}
                  onClick={() => toggleStatusFilter(label)}
                  className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition ${color} ${filterStatuses.has(label) ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-80 hover:opacity-100'}`}
                >
                  <span className="text-xl font-bold leading-none">{count}</span>
                  <span className="text-[11px] mt-1">{label}</span>
                </button>
              ))}
            </div>

            {/* 최우선 처리 항목 */}
            {priorityItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">🔴</span>
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">최우선 처리 항목 ({priorityItems.length}건)</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {priorityItems.map(r => (
                    <div key={r.template_id} className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                      <span className="text-xs font-medium text-slate-800">{r.item_name}</span>
                      {r.due_date && (
                        <span className="text-[11px] text-slate-400">({r.due_date} 까지)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filterStatuses.size > 0 && (
              <button onClick={() => setFilterStatuses(new Set())} className="text-xs text-slate-400 hover:text-red-500 transition">
                ✕ 필터 초기화
              </button>
            )}

            {/* AI 요약 */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <span className="text-xs font-bold text-slate-700">AI 진행 현황 요약</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Gemini</span>
                </div>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    aiLoading
                      ? 'border-blue-200 bg-blue-50 text-blue-400 cursor-wait'
                      : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {aiLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block animate-spin">⟳</span> 분석 중...
                    </span>
                  ) : aiSummary ? '다시 생성' : 'AI 요약 생성'}
                </button>
              </div>
              <div className="px-4 py-3">
                {aiLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="inline-block animate-pulse">●</span>
                    <span className="animate-pulse">Gemini가 QA 현황을 분석하고 있습니다...</span>
                  </div>
                )}
                {aiError && (
                  <p className="text-xs text-red-500">{aiError}</p>
                )}
                {aiSummary && !aiLoading && (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                )}
                {!aiSummary && !aiLoading && !aiError && (
                  <p className="text-xs text-slate-300">버튼을 눌러 AI가 현재 QA 진행 상황을 분석하고 요약합니다.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 모바일: 카드 레이아웃 ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {displayed.map((r, i) => (
          <div
            key={r.template_id}
            className={`rounded-xl border p-4 ${r.priority ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'}`}
          >
            {/* 헤더 행 */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {r.priority && <span className="text-sm shrink-0">🔴</span>}
                <span className="text-xs text-slate-400 font-mono shrink-0">{i + 1}</span>
                <span className="text-sm font-semibold text-slate-800 leading-tight">{r.item_name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!readOnly && (
                  <button
                    onClick={() => togglePriority(r.template_id)}
                    title={r.priority ? '최우선 해제' : '최우선 처리 설정'}
                    className={`text-base transition ${r.priority ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                  >🔴</button>
                )}
                {readOnly ? (
                  <span className={`px-2 py-1 rounded-md border text-xs font-semibold ${STATUS_STYLE[r.status || '미완료']}`}>
                    {r.status || '미완료'}
                  </span>
                ) : (
                  <select
                    value={r.status || '미완료'}
                    onChange={e => { updateRecord(r.template_id, { status: e.target.value }); save(r.template_id, { status: e.target.value }); }}
                    className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none ${STATUS_STYLE[r.status || '미완료']}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* 완료 예정일 */}
            {(r.due_date || !readOnly) && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">완료 예정일</div>
                {readOnly ? (
                  <span className="text-xs text-slate-600">{r.due_date || '—'}</span>
                ) : (
                  <input
                    type="date"
                    value={r.due_date || ''}
                    onChange={e => updateRecord(r.template_id, { due_date: e.target.value })}
                    onBlur={() => save(r.template_id)}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300/50 text-slate-700 bg-transparent"
                  />
                )}
              </div>
            )}

            {/* QA 확인 사항 */}
            {(r.qa_notes || !readOnly) && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">QA 확인 사항</div>
                <InlineEditor
                  value={r.qa_notes || ''}
                  onChange={v => updateRecord(r.template_id, { qa_notes: v })}
                  onBlur={() => save(r.template_id)}
                  placeholder="확인 내용 입력..."
                  readOnly={readOnly}
                  rows={2}
                />
              </div>
            )}

            {/* 기준 */}
            {r.standard && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">기준</div>
                <div className="text-xs font-semibold text-slate-800 bg-blue-50/60 border border-blue-100 border-l-2 border-l-blue-400 rounded-r-md px-3 py-2 whitespace-pre-wrap leading-relaxed">{r.standard}</div>
              </div>
            )}

            {/* QA 의견 */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">QA 의견</div>
              <InlineEditor
                value={r.standard_notes || ''}
                onChange={v => updateRecord(r.template_id, { standard_notes: v })}
                onBlur={() => save(r.template_id)}
                placeholder="의견 입력..."
                readOnly={readOnly}
                rows={2}
              />
            </div>

            {/* 수정 시간 */}
            {r.updated_at && (
              <div className="mt-2 text-[10px] text-slate-300 text-right">
                {saving === r.template_id ? '저장 중…' : toKST(r.updated_at)}
              </div>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-sm">해당 상태의 항목이 없습니다.</div>
        )}
      </div>

      {/* ── 데스크톱: 테이블 레이아웃 ── */}
      <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '2rem' }} />
            <col style={{ width: '1.5rem' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8rem' }} />
            <col style={{ width: '8.5rem' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '7rem' }} />
          </colgroup>
          <thead className="bg-[#f8fafc] border-b border-slate-200">
            <tr>
              <th className="text-left px-2 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="px-1 py-3.5 text-xs font-semibold text-slate-500 text-center" title="최우선">🔴</th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">QA 항목</th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setStatusDropdownOpen(o => !o)}
                    className={`flex items-center gap-1 hover:text-blue-600 transition ${filterStatuses.size > 0 ? 'text-blue-600' : ''}`}
                  >
                    <span>상태{filterStatuses.size > 0 ? ` (${filterStatuses.size})` : ''}</span>
                    <span className="text-slate-400 text-xs">{statusDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 min-w-[7rem]">
                      {STATUSES.map(s => {
                        const cnt = records.filter(r => r.status === s).length;
                        const checked = filterStatuses.has(s);
                        return (
                          <label key={s} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleStatusFilter(s)} className="accent-blue-500" />
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[s]}`}>{s}</span>
                            <span className="text-xs text-slate-400">{cnt}</span>
                          </label>
                        );
                      })}
                      {filterStatuses.size > 0 && (
                        <div className="border-t border-slate-100 mt-1 pt-1 px-3 pb-1">
                          <button onClick={() => { setFilterStatuses(new Set()); setStatusDropdownOpen(false); }} className="text-xs text-slate-500 hover:text-red-500 transition">
                            초기화
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <button onClick={toggleDueDateSort} className="flex items-center gap-1 hover:text-blue-600 transition">
                  <span>완료 예정일</span>
                  <span className="text-slate-400">{dueDateSort === 'asc' ? '↑' : dueDateSort === 'desc' ? '↓' : '↕'}</span>
                </button>
              </th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">QA 확인 사항</th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">기준 및 QA 의견</th>
              <th className="text-left px-3 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">수정 시간 (KST)</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((r, i) => (
              <tr
                key={r.template_id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition align-top group ${r.priority ? 'bg-red-50/40' : ''}`}
              >
                <td className="px-2 py-4 text-xs text-slate-400 font-mono">{i + 1}</td>

                {/* 최우선 처리 토글 */}
                <td className="px-1 py-4 text-center">
                  {readOnly ? (
                    r.priority ? <span className="text-sm">🔴</span> : null
                  ) : (
                    <button
                      onClick={() => togglePriority(r.template_id)}
                      title={r.priority ? '최우선 해제' : '최우선 처리 설정'}
                      className={`text-base transition ${r.priority ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                    >🔴</button>
                  )}
                </td>

                <td className="px-3 py-4 font-medium text-slate-800 text-xs leading-relaxed">
                  {r.priority && <span className="inline-block text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded mb-1 mr-1">최우선</span>}
                  {r.item_name}
                </td>

                {/* 상태 */}
                <td className="px-3 py-4">
                  {readOnly ? (
                    <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${STATUS_STYLE[r.status || '미완료']}`}>
                      {r.status || '미완료'}
                    </span>
                  ) : (
                    <select
                      value={r.status || '미완료'}
                      onChange={e => { updateRecord(r.template_id, { status: e.target.value }); save(r.template_id, { status: e.target.value }); }}
                      className={`text-xs font-semibold px-2 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer w-full ${STATUS_STYLE[r.status || '미완료']}`}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>

                {/* 완료 예정일 */}
                <td className="px-3 py-4">
                  {readOnly ? (
                    <span className="text-xs text-slate-600">{r.due_date || ''}</span>
                  ) : (
                    <input
                      type="date"
                      value={r.due_date || ''}
                      onChange={e => updateRecord(r.template_id, { due_date: e.target.value })}
                      onBlur={() => save(r.template_id)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-300/50 text-slate-700 bg-transparent"
                    />
                  )}
                </td>

                {/* QA 확인 사항 */}
                <td className="px-3 py-4">
                  <InlineEditor
                    value={r.qa_notes || ''}
                    onChange={v => updateRecord(r.template_id, { qa_notes: v })}
                    onBlur={() => save(r.template_id)}
                    placeholder="확인 내용 입력..."
                    readOnly={readOnly}
                    rows={3}
                  />
                </td>

                {/* 기준 및 QA 의견 */}
                <td className="px-3 py-4">
                  {r.standard && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">기준</div>
                      <div className="text-xs font-semibold text-slate-800 bg-blue-50/60 border border-blue-100 border-l-2 border-l-blue-400 rounded-r-md px-3 py-2 whitespace-pre-wrap leading-relaxed">{r.standard}</div>
                    </div>
                  )}
                  {r.file_url && (
                    <a href={r.file_url} download className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 mb-2 transition">
                      ⬇ {r.file_url.split('/').pop()}
                    </a>
                  )}
                  <div className={r.standard ? 'mt-1' : ''}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">QA 의견</div>
                    <InlineEditor
                      value={r.standard_notes || ''}
                      onChange={v => updateRecord(r.template_id, { standard_notes: v })}
                      onBlur={() => save(r.template_id)}
                      placeholder="의견 입력..."
                      readOnly={readOnly}
                      rows={3}
                    />
                  </div>
                </td>

                {/* 수정 시간 (KST) */}
                <td className="px-3 py-4">
                  {saving === r.template_id ? (
                    <span className="text-xs text-blue-500 animate-pulse">저장 중…</span>
                  ) : r.updated_at ? (
                    <span className="text-xs text-slate-400 tabular-nums">{toKST(r.updated_at)}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">해당 상태의 항목이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 필터 상태 표시 (모바일) */}
      {filterStatuses.size > 0 && (
        <div className="md:hidden mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">필터 적용됨:</span>
          {[...filterStatuses].map(s => (
            <span key={s} className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[s]}`}>{s}</span>
          ))}
          <button onClick={() => setFilterStatuses(new Set())} className="text-xs text-slate-400 hover:text-red-500 ml-auto">초기화</button>
        </div>
      )}
    </div>
  );
}
