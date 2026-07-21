'use client';
import { useState } from 'react';

interface Props {
  productId: string;
  contactEmail: string;
}

export default function SendEmailButton({ productId, contactEmail }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function send() {
    if (!contactEmail) return;
    setStatus('sending');
    setErrorMsg('');
    const res = await fetch(`/api/products/${productId}/send-email`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setErrorMsg(data.error || '발송 실패');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }

  if (!contactEmail) return null;

  return (
    <div className="relative">
      <button
        onClick={send}
        disabled={status === 'sending'}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${
          status === 'done'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
            : status === 'error'
            ? 'bg-red-50 border-red-300 text-red-600'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        } disabled:opacity-60`}
      >
        {status === 'sending' ? (
          <><span className="animate-spin text-xs">⟳</span> 발송 중...</>
        ) : status === 'done' ? (
          <>✓ 발송 완료</>
        ) : status === 'error' ? (
          <>✕ {errorMsg}</>
        ) : (
          <>✉ 이메일 발송</>
        )}
      </button>
      {status === 'idle' && (
        <div className="absolute right-0 top-full mt-1 text-xs text-slate-400 whitespace-nowrap">{contactEmail}</div>
      )}
    </div>
  );
}
