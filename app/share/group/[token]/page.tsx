export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import GroupShareClient from '@/components/GroupShareClient';

export default async function GroupSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const group = db.prepare('SELECT * FROM product_groups WHERE share_token = ?').get(token) as { id: string; name: string; share_token: string } | undefined;
  if (!group) notFound();

  const products = db.prepare(`
    SELECT p.id, p.name, p.partner_name, p.md_name, p.recording_date, p.broadcast_date, p.product_notes,
      p.mfr_eval_target, p.mfr_eval_name, p.mfr_eval_location, p.mfr_eval_notes,
      c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.group_id = ?
    ORDER BY p.created_at DESC
  `).all(group.id) as Array<{
    id: string; name: string; partner_name: string; md_name: string;
    recording_date: string; broadcast_date: string; product_notes: string; category_name: string;
    mfr_eval_target: string | null; mfr_eval_name: string | null; mfr_eval_location: string | null; mfr_eval_notes: string | null;
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <span className="font-bold text-slate-800">{group.name}</span>
        </div>
        <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">읽기 전용</span>
      </div>
      <GroupShareClient products={products} allRecords={allRecords} groupName={group.name} />
    </div>
  );
}
