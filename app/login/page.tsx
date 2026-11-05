'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-80 shrink-0 p-10 border-r border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">QA</div>
            <div>
              <div className="text-white font-bold text-base tracking-tight">QA 체크 시스템</div>
              <div className="text-slate-500 text-xs">상품 QA 진척 현황 관리</div>
            </div>
          </div>
          <div className="space-y-5">
            {['QA 체크리스트 관리', '공유 링크로 협력사 공유', '그룹별 상품 묶음 관리', '이미지 첨부 및 메모'].map(t => (
              <div key={t} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-400 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-slate-600 text-xs">© 2024 QA 체크 시스템</div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs">QA</div>
            <span className="text-white font-bold text-sm">QA 체크 시스템</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">로그인</h1>
            <p className="text-slate-500 text-sm">계정 정보를 입력하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">이메일</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="admin@qa.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-600">
            초기 계정: admin@qa.com / admin1234
          </div>
        </div>
      </div>
    </div>
  );
}
