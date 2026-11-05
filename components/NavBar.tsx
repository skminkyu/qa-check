'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface Props {
  user: { name: string; role: string };
}

export default function NavBar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const links = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/products', label: '상품 관리' },
    { href: '/settings', label: '설정' },
  ];

  return (
    <nav className="bg-white border-b border-slate-100 px-6 py-0 flex items-center justify-between shadow-sm h-14">
      <div className="flex items-center gap-8 h-full">
        <span className="font-extrabold text-slate-900 text-base tracking-tight">QA 체크 시스템</span>
        <div className="flex h-full">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-4 flex items-center text-sm font-medium transition border-b-2 ${pathname.startsWith(l.href) ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 font-medium">
          {user.name}
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-md font-semibold ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
            {user.role === 'admin' ? '관리자' : '편집자'}
          </span>
        </span>
        <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-md px-2.5 py-1 transition hover:border-slate-400">로그아웃</button>
      </div>
    </nav>
  );
}
