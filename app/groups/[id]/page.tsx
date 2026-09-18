export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import Link from 'next/link';
import GroupAdminClient from '@/components/GroupAdminClient';

export default async function GroupAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const db = getDb();

  const group = db.prepare('SELECT * FROM product_groups WHERE id = ?').get(id) as { id: string; name: string; share_token: string | null } | undefined;
  if (!group) notFound();

  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.group_id = ?
    ORDER BY p.created_at DESC
  `).all(id) as Array<{
    id: string; name: string; category_name: string; partner_name: string; md_name: string;
    contact_email: string; cc_email: string; product_notes: string;
    recording_date: string; broadcast_date: string;
    mfr_eval_target: string | null; mfr_eval_name: string | null; mfr_eval_location: string | null;
    mfr_eval_notes: string | null; mfr_eval_completed: number; mfr_eval_date: string | null;
    created_at: string;
  }>;

  const allRecords = products.map(p => {
    const records = db.prepare(`
      SELECT t.id as template_id, t.item_name, t.standard, t.file_url, t.sort_order,
        COALESCE(r.status, '미완료') as status, r.qa_notes, r.standard_notes, r.due_date, r.updated_at
      FROM qa_templates t
      LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
      WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
      ORDER BY t.sort_order
    `).all(p.id, p.id) as Array<{
      template_id: string; item_name: string; standard: string; file_url: string; sort_order: number;
      status: string; qa_notes: string; standard_notes: string; due_date: string; updated_at: string;
    }>;
    return { productId: p.id, records };
  });

  const readOnly = session.role === 'viewer';

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={session} />
      <main className="w-full px-6 py-8 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm transition">← 대시보드</Link>
          <span className="text-slate-300">/</span>
          <span className="text-lg font-bold text-slate-800">📁 {group.name}</span>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{products.length}개 상품</span>
        </div>
        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <p className="text-slate-400 text-sm">이 그룹에 등록된 상품이 없습니다.</p>
            <Link href="/dashboard" className="mt-3 inline-block text-blue-600 hover:underline text-sm">대시보드로 이동</Link>
          </div>
        ) : (
          <GroupAdminClient products={products} allRecords={allRecords} groupName={group.name} readOnly={readOnly} />
        )}
      </main>
    </div>
  );
}
