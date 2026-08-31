'use client';
import { useEffect } from 'react';

export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl leading-none hover:text-slate-300 transition"
        aria-label="닫기"
      >✕</button>
      <img
        src={src}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
      />
    </div>
  );
}
