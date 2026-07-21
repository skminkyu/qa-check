import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import QATable from '@/components/QATable';
import ShareButton from '@/components/ShareButton';
import ProductNotes from '@/components/ProductNotes';
import ProductHeader from '@/components/ProductHeader';
import SendEmailButton from '@/components/SendEmailButton';
import CaptureImageButton from '@/components/CaptureImageButton';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const db = getDb();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id) as { id: string; name: string; category_name: string; partner_name: string; md_name: string; contact_email: string; cc_email: string; product_notes: string; created_at: string; recording_date: string; broadcast_date: string } | undefined;

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
          <ProductHeader
            productId={id}
            initialName={product.name}
            initialPartnerName={product.partner_name || ''}
            initialMdName={product.md_name || ''}
            initialContactEmail={product.contact_email || ''}
            initialCcEmail={product.cc_email || ''}
            initialRecordingDate={product.recording_date || ''}
            initialBroadcastDate={product.broadcast_date || ''}
            categoryName={product.category_name}
            createdAt={product.created_at}
            readOnly={readOnly}
          />
          <div className="flex flex-col items-end gap-2">
            {!readOnly && <ShareButton productId={id} initialToken={shareToken} />}
            {!readOnly && <SendEmailButton productId={id} hasEmail={!!product.contact_email} />}
            <CaptureImageButton targetId="qa-capture-area" filename={product.name} />
          </div>
        </div>

        {/* QA 체크리스트 + 상품확인정보 (캡처 영역) */}
        <div id="qa-capture-area">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
            <QATable productId={id} initialRecords={records} readOnly={readOnly} />
          </div>
          <div>
          <ProductNotes
            productId={id}
            initialNotes={product.product_notes || ''}
            readOnly={readOnly}
          />
          </div>
        </div>
      </main>
    </div>
  );
}
