'use client';
import { useState, useEffect, useCallback } from 'react';

interface ScheduleEntry {
  date: string;
  am_blocked: number;
  pm_blocked: number;
}

interface Props {
  productId: string;
  readOnly?: boolean;
  collapsible?: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function MfrScheduleCalendar({ productId, readOnly = false, collapsible = false }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [schedules, setSchedules] = useState<Record<string, ScheduleEntry>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsible);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}/mfr-schedule`);
    const data = await res.json();
    if (data.schedules) {
      const map: Record<string, ScheduleEntry> = {};
      (data.schedules as ScheduleEntry[]).forEach(s => { map[s.date] = s; });
      setSchedules(map);
    }
  }, [productId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function toggleBlock(date: string, field: 'am_blocked' | 'pm_blocked') {
    if (saving) return;
    const current = schedules[date] ?? { date, am_blocked: 0, pm_blocked: 0 };
    const updated = { ...current, [field]: current[field] ? 0 : 1 };
    setSaving(true);
    await fetch(`/api/products/${productId}/mfr-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, amBlocked: !!updated.am_blocked, pmBlocked: !!updated.pm_blocked }),
    });
    await fetchSchedules();
    setSaving(false);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-1 hover:bg-slate-100 transition text-left"
        >
          <span className="text-xs font-semibold text-slate-600">관리자 일정 (참고용)</span>
          <span className="text-slate-400 text-xs">{collapsed ? '▼ 펼치기' : '▲ 접기'}</span>
        </button>
      ) : (
        <div className="text-xs font-semibold text-slate-500 mb-2">
          {readOnly ? '관리자 일정 (참고용)' : '일정 등록'}
        </div>
      )}
      {collapsed ? null : <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <button
            onClick={prevMonth}
            className="text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 text-sm transition"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-slate-700">{year}년 {month + 1}월</span>
          <button
            onClick={nextMonth}
            className="text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 text-sm transition"
          >
            →
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs py-1.5 font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[64px] border-b border-r border-slate-50 last:border-r-0" />;
            }
            const dateStr = toDateStr(year, month, day);
            const entry = schedules[dateStr];
            const amBlocked = entry?.am_blocked === 1;
            const pmBlocked = entry?.pm_blocked === 1;
            const isToday = dateStr === todayStr;
            const isSelected = !readOnly && selected === dateStr;
            const col = idx % 7;
            const isSun = col === 0;
            const isSat = col === 6;

            return (
              <div
                key={dateStr}
                onClick={() => !readOnly && setSelected(isSelected ? null : dateStr)}
                className={`min-h-[64px] border-b border-r border-slate-100 last:border-r-0 p-1.5 flex flex-col gap-0.5 transition
                  ${!readOnly ? 'cursor-pointer hover:bg-blue-50/40' : ''}
                  ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}
                `}
              >
                <span className={`text-xs font-medium leading-none ${
                  isToday
                    ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center'
                    : isSun ? 'text-red-400'
                    : isSat ? 'text-blue-400'
                    : 'text-slate-700'
                }`}>
                  {day}
                </span>

                {readOnly ? (
                  <>
                    {amBlocked && pmBlocked && (
                      <span className="text-[10px] bg-red-100 text-red-600 rounded px-1 py-0.5 leading-tight text-center font-medium">전체 불가</span>
                    )}
                    {amBlocked && !pmBlocked && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 rounded px-1 py-0.5 leading-tight text-center font-medium">오전 불가</span>
                    )}
                    {!amBlocked && pmBlocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 leading-tight text-center font-medium">오후 불가</span>
                    )}
                  </>
                ) : (
                  <>
                    {amBlocked && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 rounded px-1 py-0.5 leading-tight text-center">오전 불가</span>
                    )}
                    {pmBlocked && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1 py-0.5 leading-tight text-center">오후 불가</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected day controls (admin only) */}
        {!readOnly && selected && (
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center gap-6 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">{selected}</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!schedules[selected]?.am_blocked}
                onChange={() => toggleBlock(selected, 'am_blocked')}
                disabled={saving}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-slate-700">오전 불가</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!schedules[selected]?.pm_blocked}
                onChange={() => toggleBlock(selected, 'pm_blocked')}
                disabled={saving}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-slate-700">오후 불가</span>
            </label>
            {saving && <span className="text-xs text-slate-400">저장 중...</span>}
          </div>
        )}
      </div>}

      {!readOnly && !collapsed && (
        <p className="text-xs text-slate-400 mt-1.5">날짜를 클릭하여 오전/오후 불가 일정을 등록하세요.</p>
      )}
    </div>
  );
}
