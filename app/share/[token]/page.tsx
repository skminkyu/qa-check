import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import QATable from '@/components/QATable';
import ProductNotes from '@/components/ProductNotes';
import CaptureImageButton from '@/components/CaptureImageButton';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT product_id FROM share_tokens WHERE token = ?').get(token) as { product_id: string } | undefined;
  if (!shareRow) notFound();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(shareRow.product_id) as { name: string; category_name: string; partner_name: string; md_name: string; product_notes: string; created_at: string; recording_date: string; broadcast_date: string } | undefined;

  if (!product) notFound();

  function calcDday(dateStr: string): number | null {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  const records = db.prepare(`
    SELECT t.id as template_id, t.item_name, t.standard, t.file_url, t.sort_order,
      COALESCE(r.status, '미완료') as status, r.qa_notes, r.standard_notes, r.due_date, r.updated_at
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(shareRow.product_id, shareRow.product_id) as Array<{
    template_id: string; item_name: string; standard: string; file_url: string; sort_order: number; status: string; qa_notes: string; standard_notes: string; due_date: string; updated_at: string;
  }>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-slate-800">QA 체크 시스템</span>
        <div className="flex items-center gap-3">
          <CaptureImageButton targetId="qa-capture-area" filename={product.name} />
          <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">읽기 전용</span>
        </div>
      </div>
      <main className="w-full px-4 py-8">
        <div id="qa-capture-area">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{product.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-slate-500 items-center mb-6">
            <span>카테고리: <strong className="text-slate-700">{product.category_name}</strong></span>
            {product.partner_name && <span>협력사: <strong className="text-slate-700">{product.partner_name}</strong></span>}
            {product.md_name && <span>MD: <strong className="text-slate-700">{product.md_name}</strong></span>}
            {product.recording_date && (() => {
              const diff = calcDday(product.recording_date);
              const urgent = diff !== null && diff >= 0 && diff <= 3;
              const past = diff !== null && diff < 0;
              const label = diff === 0 ? 'D-Day' : diff !== null && diff > 0 ? `D-${diff}` : diff !== null ? `D+${Math.abs(diff)}` : '';
              return (
                <span className="flex items-center gap-1.5">
                  <span>🎬 녹화: <strong className="text-slate-700">{product.recording_date}</strong></span>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${past ? 'bg-gray-100 text-gray-400' : urgent ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600'}`}>
                    {urgent && '🔴 '}{label}
                  </span>
                </span>
              );
            })()}
            {product.broadcast_date && (() => {
              const diff = calcDday(product.broadcast_date);
              const urgent = diff !== null && diff >= 0 && diff <= 3;
              const past = diff !== null && diff < 0;
              const label = diff === 0 ? 'D-Day' : diff !== null && diff > 0 ? `D-${diff}` : diff !== null ? `D+${Math.abs(diff)}` : '';
              return (
                <span className="flex items-center gap-1.5">
                  <span>📺 송출: <strong className="text-slate-700">{product.broadcast_date}</strong></span>
                  <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${past ? 'bg-gray-100 text-gray-400' : urgent ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600'}`}>
                    {urgent && '🔴 '}{label}
                  </span>
                </span>
              );
            })()}
          </div>
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
            <QATable productId={shareRow.product_id} initialRecords={records} readOnly={true} />
          </div>
          <ProductNotes productId={shareRow.product_id} initialNotes={product.product_notes || ''} readOnly={true} />
        </div>
      </main>
    </div>
  );
}
