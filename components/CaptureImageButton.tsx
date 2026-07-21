'use client';
import { useState, useRef } from 'react';

interface Props {
  targetId: string;   // id of the element to capture
  filename?: string;
}

export default function CaptureImageButton({ targetId, filename = 'QA_체크리스트' }: Props) {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function capture(action: 'download' | 'copy') {
    setShowMenu(false);
    setStatus('capturing');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById(targetId);
      if (!el) throw new Error('element not found');

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        scale: 2,           // 2x for high-DPI / clarity
        backgroundColor: '#f8fafc',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        width: el.scrollWidth,
        height: el.scrollHeight,
        logging: false,
      });

      if (action === 'download') {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setStatus('done');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        canvas.toBlob(async (blob) => {
          if (!blob) throw new Error('blob error');
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setStatus('done');
          setTimeout(() => setStatus('idle'), 2500);
        }, 'image/png');
      }
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
