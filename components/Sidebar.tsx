'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Props {
  user: { name: string; role: string };
}

const NAV = [
  { href: '/dashboard', icon: '⊞', label: '대시보드' },
  { href: '/settings', icon: '⚙', label: '설정' },
];

export default function Sidebar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-52 bg-[#0f172a] flex flex-col z-40 select-none">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0">QA</div>
          <span className="text-white font-bold text-sm leading-tight tracking-tight">QA 체크<br/><span className="text-slate-400 font-normal text-xs">시스템</span></span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition group ${
                active
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}>
              <span className={`text-base ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-white/5">
        <div className="px-3 py-2.5 mb-1">
          <div className="text-xs text-slate-300 font-semibold truncate">{user.name}</div>
          <div className="mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${user.role === 'admin' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-500/20 text-slate-400'}`}>
              {user.role === 'admin' ? '관리자' : '편집자'}
            </span>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition text-sm">
          <span className="text-base">↩</span>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
