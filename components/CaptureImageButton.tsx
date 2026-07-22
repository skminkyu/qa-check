'use client';
import { useState, useRef } from 'react';

interface Props {
  targetId: string;
  filename?: string;
  productId?: string;    // product page: use /api/products/[id]/screenshot
  shareToken?: string;   // share page: use /api/share/[token]/screenshot
}

export default function CaptureImageButton({ targetId, filename = 'QA_체크리스트', productId, shareToken }: Props) {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function capture(action: 'download' | 'copy') {
    setShowMenu(false);
    setStatus('capturing');
    try {
      let screenshotUrl: string;
      if (productId) {
        screenshotUrl = `/api/products/${productId}/screenshot`;
      } else if (shareToken) {
        screenshotUrl = `/api/share/${shareToken}/screenshot`;
      } else {
        throw new Error('No productId or shareToken provided');
      }

      const res = await fetch(screenshotUrl);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();

      if (action === 'download') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }

      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (status === 'capturing') {
    return (
      <button disabled className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400">
        <span className="inline-block animate-spin">⟳</span> 캡처 중...
      </button>
    );
  }
  if (status === 'done') {
    return (
      <button disabled className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-600">
        ✓ 완료
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button disabled className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-600">
        ✕ 오류
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
      >
        🖼 이미지 저장 ▾
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 w-44">
          <button
            onClick={() => capture('download')}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
          >
            ⬇ PNG 다운로드
          </button>
          <button
            onClick={() => capture('copy')}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-100"
          >
            📋 클립보드 복사
          </button>
        </div>
      )}
    </div>
  );
}
