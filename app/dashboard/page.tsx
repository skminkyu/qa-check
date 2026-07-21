import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import Link from 'next/link';
import DashboardClient from '@/components/DashboardClient';
import DashboardCalendar from '@/components/DashboardCalendar';

const STATUS_COLORS: Record<string, string> = {
  '완료': 'bg-emerald-500',
  '진행중': 'bg-blue-500',
  '보류': 'bg-amber-500',
  '해당없음': 'bg-gray-400',
  '미완료': 'bg-slate-300',
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const db = getDb();
  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
      (SELECT COUNT(*) FROM qa_records r WHERE r.product_id = p.id AND r.status = '완료') as done_count,
      (SELECT COUNT(*) FROM qa_records r WHERE r.product_id = p.id AND r.status = '진행중') as progress_count,
      (SELECT COUNT(*) FROM qa_records r WHERE r.product_id = p.id AND r.status = '보류') as hold_count,
      (SELECT COUNT(*) FROM qa_records r WHERE r.product_id = p.id AND r.status = '해당없음') as na_count,
      (SELECT COUNT(*) FROM qa_templates t WHERE t.category_id = p.category_id) as total_count
    FROM products p JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `).all() as Array<{
    id: string; name: string; category_name: string; partner_name: string; md_name: string;
    done_count: number; progress_count: number; hold_count: number; na_count: number; total_count: number;
    created_at: string; recording_date: string; broadcast_date: string;
  }>;

  const completed = products.filter(p => {
    const effective = p.total_count - p.na_count;
    return effective > 0 && p.done_count >= effective;
  }).length;
  const stats = {
    total: products.length,
    completed,
    inProgress: products.length - completed,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={session} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          <Link href="/products/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            + 상품 등록
          </Link>
        </div>

        {/* Calendar */}
        <DashboardCalendar products={products} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: '전체 상품', value: stats.total, color: 'bg-slate-700' },
            { label: 'QA 완료', value: stats.completed, color: 'bg-emerald-600' },
            { label: '진행 중', value: stats.inProgress, color: 'bg-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500 mb-1">{s.label}</div>
              <div className={`text-3xl font-bold text-slate-800`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Product list with filters */}
        <DashboardClient products={products} />
      </main>
    </div>
  );
}
