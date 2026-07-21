'use client';
import { useState } from 'react';

interface Props {
  productId: string;
  hasEmail: boolean;
}

export default function SendEmailButton({ productId, hasEmail }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function send() {
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

  if (!hasEmail) return null;

  return (
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
        <><span className="inline-block animate-spin">⟳</span> 발송 중...</>
      ) : status === 'done' ? (
        <>✓ 발송 완료</>
      ) : status === 'error' ? (
        <>✕ {errorMsg}</>
      ) : (
        <>✉ 이메일 발송</>
      )}
    </button>
  );
}
