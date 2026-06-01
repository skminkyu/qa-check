'use client';
import { useState } from 'react';

interface Category { id: string; name: string; }
interface Template { id: string; category_id: string; item_name: string; sort_order: number; }
interface User { id: string; email: string; name: string; role: string; created_at: string; }

interface Props {
  initialCategories: Category[];
  initialTemplates: Template[];
  initialUsers: User[];
  userRole: string;
}

export default function SettingsClient({ initialCategories, initialTemplates, initialUsers, userRole }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [templates, setTemplates] = useState(initialTemplates);
  const [users, setUsers] = useState(initialUsers);
  const [selectedCat, setSelectedCat] = useState(initialCategories[0]?.id || '');
  const [newCatName, setNewCatName] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'editor' });
  const [tab, setTab] = useState<'categories' | 'users'>('categories');
  const [msg, setMsg] = useState('');

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 2000); }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName }) });
    const data = await res.json();
    if (res.ok) { setCategories(c => [...c, data]); setNewCatName(''); setSelectedCat(data.id); flash('카테고리 추가됨'); }
  }

  async function deleteCategory(id: string) {
    if (!confirm('이 카테고리와 하위 항목이 모두 삭제됩니다. 계속하시겠습니까?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x.id !== id));
    setTemplates(t => t.filter(x => x.category_id !== id));
    if (selectedCat === id) setSelectedCat(categories.find(c => c.id !== id)?.id || '');
    flash('삭제됨');
  }

  async function addItem() {
    if (!newItem.trim() || !selectedCat) return;
    const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: selectedCat, itemName: newItem }) });
    const data = await res.json();
    if (res.ok) { setTemplates(t => [...t, { id: data.id, category_id: selectedCat, item_name: data.itemName, sort_order: data.sortOrder }]); setNewItem(''); flash('항목 추가됨'); }
  }

  async function updateItem(id: string, itemName: string) {
    await fetch(`/api/templates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemName }) });
    setTemplates(t => t.map(x => x.id === id ? { ...x, item_name: itemName } : x));
  }

  async function deleteItem(id: string) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    setTemplates(t => t.filter(x => x.id !== id));
    flash('삭제됨');
  }

  async function addUser() {
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
    const data = await res.json();
    if (res.ok) { setUsers(u => [...u, { ...data, created_at: new Date().toISOString() }]); setNewUser({ email: '', name: '', password: '', role: 'editor' }); flash('사용자 추가됨'); }
    else flash(data.error);
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) { setUsers(u => u.filter(x => x.id !== id)); flash('삭제됨'); }
  }

  async function changeRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    flash('권한 변경됨');
  }

  const catTemplates = templates.filter(t => t.category_id === selectedCat);

  return (
    <div>
      {msg && <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {['categories', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t as 'categories' | 'users')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'categories' ? '카테고리 / QA 항목' : '사용자 관리'}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Category list */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">카테고리</div>
              <ul>
                {categories.map(c => (
                  <li key={c.id} onClick={() => setSelectedCat(c.id)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition ${selectedCat === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                    <span className="text-sm">{c.name}</span>
                    {userRole === 'admin' && (
                      <button onClick={e => { e.stopPropagation(); deleteCategory(c.id); }}
                        className="text-slate-300 hover:text-red-400 text-xs transition">✕</button>
                    )}
                  </li>
                ))}
              </ul>
              {userRole === 'admin' && (
                <div className="p-3 border-t border-slate-100 flex gap-2">
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                    placeholder="새 카테고리" className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  <button onClick={addCategory} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition">추가</button>
                </div>
              )}
            </div>
          </div>

          {/* Template items */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">
                  QA 항목 — {categories.find(c => c.id === selectedCat)?.name || '카테고리 선택'}
                </span>
                <span className="text-xs text-slate-400">{catTemplates.length}개 항목</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {catTemplates.length === 0 && (
                  <li className="px-4 py-6 text-center text-slate-400 text-sm">항목이 없습니다.</li>
                )}
                {catTemplates.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                    <input
                      defaultValue={t.item_name}
                      onBlur={e => updateItem(t.id, e.target.value)}
                      className="flex-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5"
                    />
                    <button onClick={() => deleteItem(t.id)} className="text-slate-300 hover:text-red-400 text-xs transition">✕</button>
                  </li>
                ))}
              </ul>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  placeholder="새 QA 항목 입력" className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={addItem} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition">추가</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && userRole === 'admin' && (
        <div className="space-y-6">
          {/* User list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">사용자 목록</div>
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left">이름</th>
                  <th className="px-4 py-2 text-left">이메일</th>
                  <th className="px-4 py-2 text-left">권한</th>
                  <th className="px-4 py-2 text-left">등록일</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none">
                        <option value="admin">관리자</option>
                        <option value="editor">편집자</option>
                        <option value="viewer">읽기전용</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{u.created_at.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => deleteUser(u.id)} className="text-slate-300 hover:text-red-400 text-xs transition">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add user */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm font-semibold text-slate-700 mb-4">사용자 추가</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">이름</label>
                <input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="홍길동" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">이메일</label>
                <input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">초기 비밀번호</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">권한</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                  <option value="admin">관리자</option>
                  <option value="editor">편집자</option>
                  <option value="viewer">읽기전용</option>
                </select>
              </div>
            </div>
            <button onClick={addUser} className="mt-4 bg-slate-800 text-white text-sm px-5 py-2 rounded-lg hover:bg-slate-700 transition">추가</button>
          </div>
        </div>
      )}
    </div>
  );
}
