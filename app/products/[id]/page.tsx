import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import QATable from '@/components/QATable';
import ShareButton from '@/components/ShareButton';
import ProductNotes from '@/components/ProductNotes';
import Link from 'next/link';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const db = getDb();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id) as { id: string; name: string; category_name: string; partner_name: string; md_name: string; product_notes: string; created_at: string } | undefined;

  if (!product) notFound();

  const records = db.prepare(`
    SELECT r.id, r.product_id, t.id as template_id, t.item_name, t.standard, t.file_url, t.sort_order,
      COALESCE(r.status, '미완료') as status, r.qa_notes, r.standard_notes, r.due_date, r.updated_at
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(id, id) as Array<{
    id: string; product_id: string; template_id: string; item_name: string; standard: string; file_url: string; sort_order: number;
    status: string; qa_notes: string; standard_notes: string; due_date: string; updated_at: string;
  }>;

  const shareToken = (db.prepare('SELECT token FROM share_tokens WHERE product_id = ?').get(id) as { token: string } | undefined)?.token;
  const readOnly = session.role === 'viewer';

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={session} />
      <main className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/dashboard" className="hover:text-slate-700">대시보드</Link>
              <span>/</span>
              <span>{product.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{product.name}</h1>
            <div className="flex gap-4 mt-2 text-sm text-slate-500">
              <span>카테고리: <strong className="text-slate-700">{product.category_name}</strong></span>
              {product.partner_name && <span>협력사: <strong className="text-slate-700">{product.partner_name}</strong></span>}
              {product.md_name && <span>MD: <strong className="text-slate-700">{product.md_name}</strong></span>}
              <span>등록일: {product.created_at.slice(0, 10)}</span>
            </div>
          </div>
          {!readOnly && (
            <ShareButton productId={id} initialToken={shareToken} />
          )}
        </div>

        {/* QA 체크리스트 */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
          <QATable productId={id} initialRecords={records} readOnly={readOnly} />
        </div>

        {/* 상품확인정보 */}
        <div>
          <ProductNotes
            productId={id}
            initialNotes={product.product_notes || ''}
            readOnly={readOnly}
          />
        </div>
      </main>
    </div>
  );
}
