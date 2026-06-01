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
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-slate-800 text-lg">QA 체크</span>
        <div className="flex gap-1">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${pathname.startsWith(l.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          {user.name}
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
            {user.role === 'admin' ? '관리자' : '편집자'}
          </span>
        </span>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800 transition">로그아웃</button>
      </div>
    </nav>
  );
}
