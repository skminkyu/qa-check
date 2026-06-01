import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import Link from 'next/link';

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
    created_at: string;
  }>;

  const stats = {
    total: products.length,
    completed: products.filter(p => p.done_count === p.total_count && p.total_count > 0).length,
    inProgress: products.filter(p => p.done_count < p.total_count && p.done_count > 0).length,
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
                <th className="text-left px-5 py-3 font-semibold text-slate-600">등록일</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">등록된 상품이 없습니다.</td></tr>
              )}
              {products.map(p => {
                const pct = p.total_count > 0 ? Math.round((p.done_count / p.total_count) * 100) : 0;
                const effective = p.total_count - p.na_count;
                const effectivePct = effective > 0 ? Math.round((p.done_count / effective) * 100) : 0;
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
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {p.done_count}/{p.total_count} ({effectivePct}%)
                        </span>
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
      </main>
    </div>
  );
}
