'use client';
import { useState } from 'react';

interface Props {
  productId: string;
  initialToken?: string;
}

export default function ShareButton({ productId, initialToken }: Props) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generateLink() {
    setLoading(true);
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    setToken(data.token);
    setLoading(false);
  }

  async function revokeLink() {
    await fetch('/api/share', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    setToken(undefined);
  }

  async function copyLink() {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <button onClick={generateLink} disabled={loading}
        className="flex items-center gap-2 text-sm border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-slate-600 disabled:opacity-50">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        {loading ? '생성 중...' : '공유 링크 생성'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={copyLink}
        className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        {copied ? '복사됨!' : '링크 복사'}
      </button>
      <button onClick={revokeLink} className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-2">링크 삭제</button>
    </div>
  );
}
