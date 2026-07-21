'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Product {
  id: string; name: string;
  recording_date: string; broadcast_date: string;
}

interface PopupInfo {
  dateLabel: string;
  recording: Product[];
  broadcast: Product[];
  anchorRect: DOMRect;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_NAMES = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];

function Popup({ info, onClose }: { info: PopupInfo; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const rect = info.anchorRect;
  const top = rect.bottom + window.scrollY + 6;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 280);

  return (
    <div ref={ref} style={{ position: 'absolute', top, left, zIndex: 50, width: 260 }}
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-slate-700 text-sm">{info.dateLabel}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
      </div>
      {info.recording.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">🎬 녹화 예정</div>
          <div className="flex flex-col gap-1">
            {info.recording.map(p => (
              <Link key={p.id} href={`/products/${p.id}`}
                className="text-xs text-blue-600 hover:underline bg-blue-50 rounded px-2 py-1 truncate block">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {info.broadcast.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">📺 송출 예정</div>
          <div className="flex flex-col gap-1">
            {info.broadcast.map(p => (
              <Link key={p.id} href={`/products/${p.id}`}
                className="text-xs text-emerald-600 hover:underline bg-emerald-50 rounded px-2 py-1 truncate block">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardCalendar({ products }: { products: Product[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  const recordingMap = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      if (p.recording_date) {
        const d = new Date(p.recording_date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        (map[key] = map[key] || []).push(p);
      }
    });
    return map;
  }, [products]);

  const broadcastMap = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      if (p.broadcast_date) {
        const d = new Date(p.broadcast_date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        (map[key] = map[key] || []).push(p);
      }
    });
    return map;
  }, [products]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setPopup(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setPopup(null);
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  function handleDayClick(d: number, e: React.MouseEvent<HTMLDivElement>) {
    const key = `${viewYear}-${viewMonth}-${d}`;
    const rec = recordingMap[key] || [];
    const brd = broadcastMap[key] || [];
    if (rec.length === 0 && brd.length === 0) { setPopup(null); return; }
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const dateLabel = `${viewYear}년 ${MONTHS[viewMonth]} ${d}일`;
    setPopup({ dateLabel, recording: rec, broadcast: brd, anchorRect: rect });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-8 flex gap-6 items-stretch relative">
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
            const hasRec = !!recordingMap[key];
            const hasBrd = !!broadcastMap[key];
            const hasEvent = hasRec || hasBrd;
            return (
              <div key={i}
                onClick={hasEvent ? (e) => handleDayClick(d, e) : undefined}
                className={`relative flex flex-col items-center py-1 rounded-md transition ${
                  isToday ? 'bg-blue-600 text-white' : hasEvent ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer' : 'hover:bg-slate-50 cursor-default'
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
          <span className="text-xs text-slate-400 flex items-center gap-1">🎬 녹화 예정일 (클릭으로 상품 확인)</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">📺 송출 예정일</span>
        </div>
      </div>

      {popup && <Popup info={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}
