'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Product {
  id: string; name: string; category_name: string; partner_name: string; md_name: string;
  done_count: number; progress_count: number; hold_count: number; na_count: number; total_count: number;
  created_at: string; recording_date: string; broadcast_date: string;
}

interface Props { products: Product[]; }

function calcDday(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function DdayBadge({ diff, label }: { diff: number | null; label: string }) {
  if (diff === null) return null;
  const urgent = diff >= 0 && diff <= 3;
  const past = diff < 0;
  const text = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${past ? 'bg-gray-100 text-gray-400' : urgent ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
      {urgent && !past && '🔴 '}{label} {text}
    </span>
  );
}

export default function DashboardClient({ products }: Props) {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterMd, setFilterMd] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category_name))).sort(), [products]);
  const partners = useMemo(() => Array.from(new Set(products.map(p => p.partner_name).filter(Boolean))).sort(), [products]);
  const mds = useMemo(() => Array.from(new Set(products.map(p => p.md_name).filter(Boolean))).sort(), [products]);

  const filtered = useMemo(() => products.filter(p =>
    (!filterCategory || p.category_name === filterCategory) &&
    (!filterPartner || p.partner_name === filterPartner) &&
    (!filterMd || p.md_name === filterMd)
  ), [products, filterCategory, filterPartner, filterMd]);

  const isFiltered = filterCategory || filterPartner || filterMd;

  // 긴급 상품: 녹화/송출일 중 가장 가까운 날짜 기준, 3일 이내 또는 지난 것
  const urgentProducts = useMemo(() => {
    return products
      .map(p => {
        const rd = calcDday(p.recording_date);
        const bd = calcDday(p.broadcast_date);
        const minDiff = [rd, bd].filter(d => d !== null).reduce((a: number | null, b) => {
          if (a === null) return b;
          if (b === null) return a;
          return Math.abs(a) < Math.abs(b) ? a : b;
        }, null as number | null);
        return { ...p, rdiff: rd, bdiff: bd, minDiff };
      })
      .filter(p => {
        if (p.minDiff === null || p.minDiff > 3) return false;
        const effective = p.total_count - p.na_count;
        const completed = effective > 0 && p.done_count >= effective;
        return !completed;
      })
      .sort((a, b) => (a.minDiff ?? 999) - (b.minDiff ?? 999));
  }, [products]);

  return (
    <>
      {/* 알림창 */}
      {urgentProducts.length > 0 && !alertDismissed && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <span className="font-semibold text-red-700 text-sm">마감 임박 상품 ({urgentProducts.length}건) — 오늘 기준 빠른 처리 필요</span>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="text-red-300 hover:text-red-500 text-xs transition">✕ 닫기</button>
          </div>
          <div className="flex flex-col gap-2">
            {urgentProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white border border-red-100 rounded-lg px-3 py-2">
                <Link href={`/products/${p.id}`} className="font-medium text-slate-800 text-sm hover:text-blue-600 hover:underline flex-1 truncate">
                  {p.name}
                </Link>
                <span className="text-xs text-slate-400">{p.category_name}</span>
                <div className="flex gap-1.5">
                  {p.rdiff !== null && <DdayBadge diff={p.rdiff} label="녹화" />}
                  {p.bdiff !== null && <DdayBadge diff={p.bdiff} label="송출" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${filterCategory ? 'border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
          <option value="">카테고리 전체</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPartner} onChange={e => setFilterPartner(e.target.value)}
          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${filterPartner ? 'border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
          <option value="">협력사 전체</option>
          {partners.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterMd} onChange={e => setFilterMd(e.target.value)}
          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${filterMd ? 'border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
          <option value="">MD 전체</option>
          {mds.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {isFiltered && (
          <>
            <button onClick={() => { setFilterCategory(''); setFilterPartner(''); setFilterMd(''); }}
              className="text-sm text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
              필터 초기화
            </button>
            <span className="text-xs text-slate-400">{filtered.length}개 표시 중</span>
          </>
        )}
      </div>

      {/* Product list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">상품명</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">카테고리</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">협력사</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">MD</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">진척률</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">녹화 / 송출</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">등록일</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">해당 조건의 상품이 없습니다.</td></tr>
            )}
            {filtered.map(p => {
              const pct = p.total_count > 0 ? Math.round((p.done_count / p.total_count) * 100) : 0;
              const effective = p.total_count - p.na_count;
              const effectivePct = effective > 0 ? Math.round((p.done_count / effective) * 100) : 0;
              const rd = calcDday(p.recording_date);
              const bd = calcDday(p.broadcast_date);
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-5 py-3 text-slate-600">{p.category_name}</td>
                  <td className="px-5 py-3 text-slate-600">{p.partner_name || '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{p.md_name || '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[80px]">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{p.done_count}/{p.total_count} ({effectivePct}%)</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      {p.recording_date ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">🎬</span>
                          <span className="text-xs text-slate-600">{p.recording_date}</span>
                          <DdayBadge diff={rd} label="" />
                        </div>
                      ) : null}
                      {p.broadcast_date ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">📺</span>
                          <span className="text-xs text-slate-600">{p.broadcast_date}</span>
                          <DdayBadge diff={bd} label="" />
                        </div>
                      ) : null}
                      {!p.recording_date && !p.broadcast_date && <span className="text-xs text-slate-300">-</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{p.created_at.slice(0, 10)}</td>
                  <td className="px-5 py-3">
                    <Link href={`/products/${p.id}`} className="text-blue-600 hover:underline text-xs">상세 보기</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
