'use client';
import { useState } from 'react';

export default function SendRemindButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleClick() {
    if (!confirm('리마인드 메일을 지금 발송하시겠습니까?')) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/cron/remind?productId=${productId}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMsg(`✓ 발송 완료 (${data.to?.join(', ')})`);
      } else {
        setMsg(`오류: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
      }
    } catch {
      setMsg('발송 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition disabled:opacity-50"
      >
        {loading ? '발송 중...' : '📧 리마인드 메일 발송'}
      </button>
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
