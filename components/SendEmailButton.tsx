'use client';
import { useState } from 'react';

interface Props {
  productId: string;
  hasEmail: boolean;
}

export default function SendEmailButton({ productId, hasEmail }: Props) {
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [sendError, setSendError] = useState('');

  async function handleResend() {
    setSendStatus('sending');
    setSendError('');
    const res = await fetch(`/api/products/${productId}/send-email`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setSendStatus('done');
      setTimeout(() => setSendStatus('idle'), 3000);
    } else {
      setSendStatus('error');
      setSendError(data.error || '발송 실패');
      setTimeout(() => setSendStatus('idle'), 4000);
    }
  }

  function handleDraft() {
    window.location.href = `/api/products/${productId}/draft-email`;
  }

  if (!hasEmail) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {/* 아웃룩 초안 다운로드 (주 버튼) */}
      <button
        onClick={handleDraft}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
      >
        📧 아웃룩 초안 열기
      </button>

      {/* Resend 직접 발송 (보조) */}
      <button
        onClick={handleResend}
        disabled={sendStatus === 'sending'}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${
          sendStatus === 'done'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
            : sendStatus === 'error'
            ? 'bg-red-50 border-red-300 text-red-600'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        } disabled:opacity-60`}
      >
        {sendStatus === 'sending' ? (
          <><span className="inline-block animate-spin">⟳</span> 발송 중...</>
        ) : sendStatus === 'done' ? (
          <>✓ 발송 완료</>
        ) : sendStatus === 'error' ? (
          <>✕ {sendError}</>
        ) : (
          <>✉ 직접 발송 (Resend)</>
        )}
      </button>
    </div>
  );
}
