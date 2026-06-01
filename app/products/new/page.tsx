'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';

interface Category { id: string; name: string; }
interface User { name: string; role: string; }

export default function NewProductPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: '', categoryId: '', partnerName: '', mdName: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categoryId) { setError('카테고리를 선택해주세요.'); return; }
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, categoryId: form.categoryId, partnerName: form.partnerName, mdName: form.mdName }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/products/${data.id}`);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={user} />
      <main className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-xl font-bold text-slate-800 mb-6">상품 등록</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">상품명 <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: [브랜드명] 수분 크림 50ml" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">카테고리 <span className="text-red-500">*</span></label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">선택</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">협력사</label>
            <input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="협력사명" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">담당 MD</label>
            <input value={form.mdName} onChange={e => setForm(f => ({ ...f, mdName: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="MD 이름" />
          </div>
          {error && <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition">취소</button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
