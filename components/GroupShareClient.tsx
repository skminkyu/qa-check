'use client';
import { useState } from 'react';
import QATable from '@/components/QATable';
import ProductNotes from '@/components/ProductNotes';

interface Product {
  id: string; name: string; partner_name: string; md_name: string;
  recording_date: string; broadcast_date: string; product_notes: string; category_name: string;
}

interface RecordRow {
  template_id: string; item_name: string; standard: string; file_url: string; sort_order: number;
  status: string; qa_notes: string; standard_notes: string; due_date: string; updated_at: string;
}

interface Props {
  products: Product[];
  allRecords: Array<{ productId: string; records: RecordRow[] }>;
  groupName: string;
}

function calcDday(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function DdayBadge({ dateStr, label }: { dateStr: string; label: string }) {
  const diff = calcDday(dateStr);
  if (diff === null) return null;
  const urgent = diff >= 0 && diff <= 3;
  const past = diff < 0;
  const tag = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}: <strong className="text-slate-700">{dateStr}</strong></span>
      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${past ? 'bg-gray-100 text-gray-400' : urgent ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600'}`}>
        {urgent && '🔴 '}{tag}
      </span>
    </span>
  );
}

export default function GroupShareClient({ products, allRecords, groupName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (products.length === 0) {
    return (
      <main className="w-full px-4 py-16 text-center text-slate-400">
        이 그룹에 등록된 상품이 없습니다.
      </main>
    );
  }

  const product = products[activeIdx];
  const records = allRecords.find(r => r.productId === product.id)?.records ?? [];

  return (
    <main className="w-full max-w-screen-xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {products.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setActiveIdx(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              activeIdx === i
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Product info */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{product.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 items-center mb-6">
          <span>카테고리: <strong className="text-slate-700">{product.category_name}</strong></span>
          {product.partner_name && <span>협력사: <strong className="text-slate-700">{product.partner_name}</strong></span>}
          {product.md_name && <span>MD: <strong className="text-slate-700">{product.md_name}</strong></span>}
          {product.recording_date && <DdayBadge dateStr={product.recording_date} label="🎬 녹화" />}
          {product.broadcast_date && <DdayBadge dateStr={product.broadcast_date} label="📺 송출" />}
        </div>
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3">QA 체크리스트</h2>
          <QATable key={product.id} productId={product.id} initialRecords={records} readOnly={true} />
        </div>
        <ProductNotes key={product.id + '-notes'} productId={product.id} initialNotes={product.product_notes || ''} readOnly={true} />
      </div>
    </main>
  );
}
