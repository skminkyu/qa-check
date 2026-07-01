import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import QATable from '@/components/QATable';
import ProductNotes from '@/components/ProductNotes';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT product_id FROM share_tokens WHERE token = ?').get(token) as { product_id: string } | undefined;
  if (!shareRow) notFound();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(shareRow.product_id) as { name: string; category_name: string; partner_name: string; md_name: string; product_notes: string; created_at: string } | undefined;

  if (!product) notFound();

  const records = db.prepare(`
    SELECT t.id as template_id, t.item_name, t.standard, t.file_url, t.sort_order,
      COALESCE(r.status, '미완료') as status, r.qa_notes, r.standard_notes
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(shareRow.product_id, shareRow.product_id) as Array<{
    template_id: string; item_name: string; standard: string; file_url: string; sort_order: number; status: string; qa_notes: string; standard_notes: string;
  }>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-slate-800">QA 체크 시스템</span>
        <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">읽기 전용</span>
      </div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{product.name}</h1>
          <div className="flex gap-4 text-sm text-slate-500">
            <span>카테고리: <strong className="text-slate-700">{product.category_name}</strong></span>
            {product.partner_name && <span>협력사: <strong className="text-slate-700">{product.partner_name}</strong></span>}
            {product.md_name && <span>MD: <strong className="text-slate-700">{product.md_name}</strong></span>}
          </div>
        </div>
        <div className="mb-6">
          <ProductNotes productId={shareRow.product_id} initialNotes={product.product_notes || ''} readOnly={true} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
          <QATable productId={shareRow.product_id} initialRecords={records} readOnly={true} />
        </div>
      </main>
    </div>
  );
}
