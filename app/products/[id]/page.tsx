export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import QATable from '@/components/QATable';
import ShareButton from '@/components/ShareButton';
import ProductNotes from '@/components/ProductNotes';
import ProductHeader from '@/components/ProductHeader';
import SendEmailButton from '@/components/SendEmailButton';
import CaptureImageButton from '@/components/CaptureImageButton';
import ExportTableButton from '@/components/ExportTableButton';
import ManufacturerEval from '@/components/ManufacturerEval';
import SendRemindButton from '@/components/SendRemindButton';
import ChatPanel from '@/components/ChatPanel';
import ProductLabelImages from '@/components/ProductLabelImages';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const db = getDb();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id) as { id: string; name: string; category_name: string; partner_name: string; md_name: string; contact_email: string; cc_email: string; product_notes: string; created_at: string; recording_date: string; broadcast_date: string; mfr_eval_target: string | null; mfr_eval_name: string | null; mfr_eval_location: string | null; mfr_eval_notes: string | null; mfr_eval_completed: number; mfr_eval_date: string | null } | undefined;

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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={session} />
      <main className="flex-1 pl-52 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <a href="/dashboard" className="text-slate-400 hover:text-slate-600 transition shrink-0">대시보드</a>
            <span className="text-slate-200">/</span>
            <span className="text-slate-700 font-semibold truncate">{product.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!readOnly && <ShareButton productId={id} initialToken={shareToken} />}
            {!readOnly && <SendEmailButton productId={id} hasEmail={!!product.contact_email} />}
            {!readOnly && !!product.contact_email && <SendRemindButton productId={id} />}
            <ExportTableButton productName={product.name} records={records} />
            <CaptureImageButton targetId="qa-capture-area" filename={product.name} productId={id} />
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* 상품 헤더 카드 */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
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
          </div>

          {/* 제조사 평가 */}
          <ManufacturerEval
            productId={id}
            categoryName={product.category_name}
            initialTarget={product.mfr_eval_target}
            initialName={product.mfr_eval_name}
            initialLocation={product.mfr_eval_location}
            initialNotes={product.mfr_eval_notes}
            initialCompleted={!!product.mfr_eval_completed}
            initialEvalDate={product.mfr_eval_date}
            readOnly={readOnly}
          />

          {/* QA 체크리스트 */}
          <div id="qa-capture-area" className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">QA 체크리스트</h2>
            <QATable productId={id} initialRecords={records} readOnly={readOnly} />
          </div>

          <ProductLabelImages productId={id} readOnly={readOnly} />

          <ProductNotes
            productId={id}
            initialNotes={product.product_notes || ''}
            readOnly={readOnly}
          />

          <ChatPanel productId={id} />
        </div>
      </main>
    </div>
  );

}
