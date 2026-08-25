'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';

function DeleteModal({ productName, onConfirm, onCancel }: { productName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-slate-800">상품 삭제</h2>
        </div>
        <p className="text-sm text-slate-600 mb-1">아래 상품을 삭제하시겠습니까?</p>
        <p className="text-sm font-semibold text-slate-800 mb-3">"{productName}"</p>
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-5">
          상품을 삭제하면 QA 체크 내용 및 세부 정보가 모두 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition">아니오</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition font-medium">예, 삭제합니다</button>
        </div>
      </div>
    </div>
  );
}

interface Product {
  id: string; name: string; category_name: string; partner_name: string; md_name: string;
  group_id: string | null; group_name: string | null;
  done_count: number; progress_count: number; hold_count: number; na_count: number; total_count: number;
  created_at: string; recording_date: string; broadcast_date: string;
}

interface Group { id: string; name: string; share_token?: string | null; }

interface Props { products: Product[]; groups: Group[]; }

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

function ProductRow({ p, groups, onGroupChange, onDelete, inGroup }: { p: Product; groups: Group[]; onGroupChange: (productId: string, groupId: string | null) => void; onDelete: (productId: string) => void; inGroup?: boolean }) {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pct = p.total_count > 0 ? Math.round((p.done_count / p.total_count) * 100) : 0;
  const effective = p.total_count - p.na_count;
  const effectivePct = effective > 0 ? Math.round((p.done_count / effective) * 100) : 0;
  const rd = calcDday(p.recording_date);
  const bd = calcDday(p.broadcast_date);

  async function assignGroup(groupId: string | null) {
    setShowGroupMenu(false);
    await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    });
    onGroupChange(p.id, groupId);
  }

  return (
    <tr className={`border-b transition ${inGroup ? 'border-violet-50 bg-violet-50/30 hover:bg-violet-50/60' : 'border-slate-100 hover:bg-slate-50'}`}>
      <td className={`py-3 font-medium text-slate-800 ${inGroup ? 'pl-10 pr-5' : 'px-5'}`}>
        <div className="flex items-center gap-2">
          <span>{p.name}</span>
          <div className="relative">
            <button
              onClick={() => setShowGroupMenu(v => !v)}
              title={p.group_name ? `그룹: ${p.group_name}` : '그룹 지정'}
              className={`text-xs px-1.5 py-0.5 rounded border transition ${p.group_id ? 'border-violet-300 bg-violet-50 text-violet-600' : 'border-slate-200 text-slate-300 hover:text-slate-500'}`}
            >
              📁
            </button>
            {showGroupMenu && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-44 py-1">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100">그룹 지정</div>
                {groups.map(g => (
                  <button key={g.id} onClick={() => assignGroup(g.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition ${p.group_id === g.id ? 'text-violet-600 font-medium' : 'text-slate-700'}`}>
                    📁 {g.name} {p.group_id === g.id && '✓'}
                  </button>
                ))}
                {p.group_id && (
                  <button onClick={() => assignGroup(null)}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-50 transition border-t border-slate-100">
                    그룹 해제
                  </button>
                )}
                {groups.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-400">그룹 없음 — 아래에서 생성</div>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
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
        <div className="flex items-center gap-3">
          <Link href={`/products/${p.id}`} className="text-blue-600 hover:underline text-xs whitespace-nowrap">상세 보기</Link>
          <button onClick={() => setConfirmDelete(true)}
            className="text-slate-300 hover:text-red-400 text-xs transition whitespace-nowrap">삭제</button>
        </div>
        {confirmDelete && (
          <DeleteModal
            productName={p.name}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              if (deleting) return;
              setDeleting(true);
              await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
              onDelete(p.id);
            }}
          />
        )}
      </td>
    </tr>
  );
}

export default function DashboardClient({ products: initialProducts, groups: initialGroups }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [groups, setGroups] = useState(initialGroups);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterMd, setFilterMd] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [sortByProgress, setSortByProgress] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupCreate, setShowGroupCreate] = useState(false);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category_name))).sort(), [products]);
  const partners = useMemo(() => Array.from(new Set(products.map(p => p.partner_name).filter(Boolean))).sort(), [products]);
  const mds = useMemo(() => Array.from(new Set(products.map(p => p.md_name).filter(Boolean))).sort(), [products]);

  const filtered = useMemo(() => {
    let list = products.filter(p =>
      (!filterCategory || p.category_name === filterCategory) &&
      (!filterPartner || p.partner_name === filterPartner) &&
      (!filterMd || p.md_name === filterMd)
    );
    if (sortByProgress) {
      list = list
        .filter(p => { const e = p.total_count - p.na_count; return !(e > 0 && p.done_count >= e); })
        .sort((a, b) => {
          const pctA = (a.total_count - a.na_count) > 0 ? a.done_count / (a.total_count - a.na_count) : 0;
          const pctB = (b.total_count - b.na_count) > 0 ? b.done_count / (b.total_count - b.na_count) : 0;
          return pctB - pctA;
        });
    }
    return list;
  }, [products, filterCategory, filterPartner, filterMd, sortByProgress]);

  const isFiltered = filterCategory || filterPartner || filterMd;

  const urgentProducts = useMemo(() => {
    return products
      .map(p => {
        const rd = calcDday(p.recording_date);
        const bd = calcDday(p.broadcast_date);
        const minDiff = [rd, bd].filter(d => d !== null).reduce((a: number | null, b) => {
          if (a === null) return b; if (b === null) return a;
          return Math.abs(a) < Math.abs(b) ? a : b;
        }, null as number | null);
        return { ...p, rdiff: rd, bdiff: bd, minDiff };
      })
      .filter(p => {
        if (p.minDiff === null || p.minDiff > 3) return false;
        const effective = p.total_count - p.na_count;
        return !(effective > 0 && p.done_count >= effective);
      })
      .sort((a, b) => (a.minDiff ?? 999) - (b.minDiff ?? 999));
  }, [products]);

  function handleDelete(productId: string) {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }

  function handleGroupChange(productId: string, groupId: string | null) {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const grp = groups.find(g => g.id === groupId);
      return { ...p, group_id: groupId, group_name: grp?.name ?? null };
    }));
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const res = await fetch('/api/product-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setGroups(g => [...g, data]);
      setNewGroupName('');
      setShowGroupCreate(false);
    }
  }

  async function copyGroupShare(groupId: string) {
    const res = await fetch(`/api/product-groups/${groupId}/share`, { method: 'POST' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert('링크 생성 실패: ' + (err.error || res.status)); return; }
    const { token } = await res.json();
    const url = `${window.location.origin}/share/group/${token}`;
    setGroups(g => g.map(x => x.id === groupId ? { ...x, share_token: token } : x));
    try {
      await navigator.clipboard.writeText(url);
      alert('그룹 공유 링크가 클립보드에 복사되었습니다.\n\n' + url);
    } catch {
      prompt('아래 링크를 복사하세요 (Ctrl+A → Ctrl+C):', url);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('그룹을 삭제하면 소속 상품은 그룹 해제됩니다.')) return;
    await fetch(`/api/product-groups/${groupId}`, { method: 'DELETE' });
    setGroups(g => g.filter(x => x.id !== groupId));
    setProducts(p => p.map(x => x.group_id === groupId ? { ...x, group_id: null, group_name: null } : x));
  }

  // Build ordered rows: groups first (with products), then ungrouped
  const groupedProducts = useMemo(() => {
    const byGroup = new Map<string, Product[]>();
    groups.forEach(g => byGroup.set(g.id, []));
    const ungrouped: Product[] = [];
    for (const p of filtered) {
      if (p.group_id && byGroup.has(p.group_id)) byGroup.get(p.group_id)!.push(p);
      else ungrouped.push(p);
    }
    return { byGroup, ungrouped };
  }, [filtered, groups]);

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
                <Link href={`/products/${p.id}`} className="font-medium text-slate-800 text-sm hover:text-blue-600 hover:underline flex-1 truncate">{p.name}</Link>
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
        <button
          onClick={() => setSortByProgress(v => !v)}
          className={`text-sm border rounded-lg px-3 py-1.5 transition ${sortByProgress ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          {sortByProgress ? '✓ 진척률 순 (100% 제외)' : '진척률 순 정렬'}
        </button>

        {/* 그룹 관리 */}
        <div className="ml-auto flex items-center gap-2">
          {groups.map(g => (
            <span key={g.id} className="inline-flex items-center gap-1 text-xs bg-violet-50 border border-violet-200 text-violet-700 px-2 py-1 rounded-full">
              📁 {g.name}
              <button onClick={() => deleteGroup(g.id)} className="text-violet-300 hover:text-red-400 ml-0.5 transition">✕</button>
            </span>
          ))}
          {showGroupCreate ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') setShowGroupCreate(false); }}
                placeholder="그룹 이름"
                className="text-sm border border-violet-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 w-32"
              />
              <button onClick={createGroup} className="text-sm bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition">추가</button>
              <button onClick={() => setShowGroupCreate(false)} className="text-sm text-slate-400 hover:text-slate-600 transition">취소</button>
            </div>
          ) : (
            <button onClick={() => setShowGroupCreate(true)}
              className="text-sm border border-violet-200 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition">
              + 그룹 만들기
            </button>
          )}
        </div>

        {(isFiltered || sortByProgress) && (
          <>
            <button onClick={() => { setFilterCategory(''); setFilterPartner(''); setFilterMd(''); setSortByProgress(false); }}
              className="text-sm text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition">
              초기화
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

            {/* Grouped products */}
            {groups.map(g => {
              const gProducts = groupedProducts.byGroup.get(g.id) || [];
              if (gProducts.length === 0) return null;
              const collapsed = collapsedGroups.has(g.id);
              return (
                <>
                  <tr key={`group-${g.id}`} className="bg-violet-50 border-b border-violet-100">
                    <td colSpan={8} className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleGroup(g.id)} className="flex items-center gap-2 flex-1 text-left">
                          <span className="text-sm">{collapsed ? '▶' : '▼'}</span>
                          <span className="text-sm font-semibold text-violet-800">📁 {g.name}</span>
                          <span className="text-xs text-violet-500">{gProducts.length}개 상품</span>
                        </button>
                        <button
                          onClick={() => copyGroupShare(g.id)}
                          title="그룹 공유 링크 복사"
                          className="text-xs flex items-center gap-1 px-2.5 py-1 rounded border border-violet-300 bg-white text-violet-600 hover:bg-violet-100 transition shrink-0"
                        >
                          🔗 공유 링크 복사
                        </button>
                      </div>
                    </td>
                  </tr>
                  {!collapsed && gProducts.map(p => (
                    <ProductRow key={p.id} p={p} groups={groups} onGroupChange={handleGroupChange} onDelete={handleDelete} inGroup />
                  ))}
                </>
              );
            })}

            {/* Ungrouped products */}
            {groupedProducts.ungrouped.length > 0 && groups.some(g => (groupedProducts.byGroup.get(g.id) || []).length > 0) && (
              <tr><td colSpan={8} className="px-5 pt-4 pb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">단독 상품</span>
              </td></tr>
            )}
            {groupedProducts.ungrouped.map(p => (
              <ProductRow key={p.id} p={p} groups={groups} onGroupChange={handleGroupChange} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
