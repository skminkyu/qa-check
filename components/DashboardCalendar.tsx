'use client';
import { useState, useMemo } from 'react';

interface Product {
  id: string; name: string;
  recording_date: string; broadcast_date: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];

export default function DashboardCalendar({ products }: { products: Product[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const recordingDays = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.recording_date) {
        const d = new Date(p.recording_date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        (map[key] = map[key] || []).push(p.name);
      }
    });
    return map;
  }, [products]);

  const broadcastDays = useMemo(() => {
    const map: Record<string, string[]> = {};
    products.forEach(p => {
      if (p.broadcast_date) {
        const d = new Date(p.broadcast_date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        (map[key] = map[key] || []).push(p.name);
      }
    });
    return map;
  }, [products]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-8 flex gap-6 items-stretch">
      {/* 오늘 날짜 (좌측) */}
      <div className="flex flex-col items-center justify-center min-w-[130px] bg-blue-600 text-white rounded-xl p-5">
        <div className="text-sm font-medium opacity-80 mb-1">{DAY_NAMES[today.getDay()]}</div>
        <div className="text-6xl font-bold leading-none mb-2">{today.getDate()}</div>
        <div className="text-sm font-medium opacity-80">{today.getFullYear()}년 {MONTHS[today.getMonth()]}</div>
      </div>

      {/* 캘린더 (우측) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded transition text-slate-500 text-lg leading-none">‹</button>
          <span className="font-semibold text-slate-700 text-sm">{viewYear}년 {MONTHS[viewMonth]}</span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded transition text-slate-500 text-lg leading-none">›</button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const key = `${viewYear}-${viewMonth}-${d}`;
            const isToday = key === todayKey;
            const hasRec = !!recordingDays[key];
            const hasBrd = !!broadcastDays[key];
            const recNames = recordingDays[key] || [];
            const brdNames = broadcastDays[key] || [];
            const tooltipLines = [...recNames.map(n => `🎬 ${n}`), ...brdNames.map(n => `📺 ${n}`)];
            return (
              <div key={i} title={tooltipLines.join('\n') || undefined}
                className={`relative flex flex-col items-center py-1 rounded-md cursor-default transition ${
                  isToday ? 'bg-blue-600 text-white' : (hasRec || hasBrd) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                }`}>
                <span className={`text-xs font-medium ${
                  isToday ? 'text-white' : i % 7 === 0 ? 'text-red-500' : i % 7 === 6 ? 'text-blue-500' : 'text-slate-700'
                }`}>{d}</span>
                <div className="flex gap-0.5 mt-0.5 min-h-[10px]">
                  {hasRec && <span className="text-[9px] leading-none">🎬</span>}
                  {hasBrd && <span className="text-[9px] leading-none">📺</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400 flex items-center gap-1">🎬 녹화 예정일</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">📺 송출 예정일</span>
        </div>
      </div>
    </div>
  );
}
