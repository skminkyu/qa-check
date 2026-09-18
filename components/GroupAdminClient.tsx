'use client';
import { useState } from 'react';
import QATable from './QATable';
import ProductNotes from './ProductNotes';
import ManufacturerEval from './ManufacturerEval';
import ProductHeader from './ProductHeader';
import CaptureImageButton from './CaptureImageButton';
import { QARecord } from './QATable';

interface Product {
  id: string;
  name: string;
  category_name: string;
  partner_name: string;
  md_name: string;
  contact_email: string;
  cc_email: string;
  product_notes: string;
  recording_date: string;
  broadcast_date: string;
  mfr_eval_target: string | null;
  mfr_eval_name: string | null;
  mfr_eval_location: string | null;
  mfr_eval_notes: string | null;
  mfr_eval_completed: number;
  mfr_eval_date: string | null;
  created_at: string;
}

interface ProductRecords {
  productId: string;
  records: QARecord[];
}

interface Props {
  products: Product[];
  allRecords: ProductRecords[];
  groupName: string;
  readOnly: boolean;
}

export default function GroupAdminClient({ products, allRecords, groupName, readOnly }: Props) {
  const [activeTab, setActiveTab] = useState(products[0]?.id ?? '');

  const activeProduct = products.find(p => p.id === activeTab);
  const activeRecords = allRecords.find(r => r.productId === activeTab)?.records ?? [];

  if (!activeProduct) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-slate-200">
        {products.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`shrink-0 text-sm px-4 py-2 rounded-t-lg border transition whitespace-nowrap ${
              activeTab === p.id
                ? 'bg-white border-slate-200 border-b-white text-blue-700 font-semibold -mb-px'
                : 'bg-slate-50 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Active product content */}
      <div key={activeTab}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <ProductHeader
            productId={activeProduct.id}
            initialName={activeProduct.name}
            initialPartnerName={activeProduct.partner_name || ''}
            initialMdName={activeProduct.md_name || ''}
            initialContactEmail={activeProduct.contact_email || ''}
            initialCcEmail={activeProduct.cc_email || ''}
            initialRecordingDate={activeProduct.recording_date || ''}
            initialBroadcastDate={activeProduct.broadcast_date || ''}
            categoryName={activeProduct.category_name}
            createdAt={activeProduct.created_at}
            readOnly={readOnly}
          />
          <div className="shrink-0 ml-4">
            <CaptureImageButton targetId="qa-capture-area" filename={activeProduct.name} productId={activeProduct.id} />
          </div>
        </div>

        {/* 제조사 평가 */}
        <ManufacturerEval
          productId={activeProduct.id}
          categoryName={activeProduct.category_name}
          initialTarget={activeProduct.mfr_eval_target}
          initialName={activeProduct.mfr_eval_name}
          initialLocation={activeProduct.mfr_eval_location}
          initialNotes={activeProduct.mfr_eval_notes}
          initialCompleted={!!activeProduct.mfr_eval_completed}
          initialEvalDate={activeProduct.mfr_eval_date}
          readOnly={readOnly}
        />

        {/* QA 체크리스트 */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
          <QATable productId={activeProduct.id} initialRecords={activeRecords} readOnly={readOnly} />
        </div>

        {/* 제품 메모 */}
        <ProductNotes
          productId={activeProduct.id}
          initialNotes={activeProduct.product_notes || ''}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
