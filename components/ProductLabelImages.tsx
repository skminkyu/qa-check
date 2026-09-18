'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_SLOTS = 8;

interface Props {
  productId: string;
  readOnly?: boolean;
}

function compressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProductLabelImages({ productId, readOnly = false }: Props) {
  const [images, setImages] = useState<(string | null)[]>(Array(MAX_SLOTS).fill(null));
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number | null>(null);
  const imagesRef = useRef(images);

  useEffect(() => { imagesRef.current = images; }, [images]);

  useEffect(() => {
    fetch(`/api/products/${productId}/label-images`)
      .then(r => r.json())
      .then(data => {
        const arr: (string | null)[] = Array(MAX_SLOTS).fill(null);
        (data.images || []).forEach(({ slot_index, image_data }: { slot_index: number; image_data: string }) => {
          if (slot_index >= 0 && slot_index < MAX_SLOTS) arr[slot_index] = image_data;
        });
        setImages(arr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (readOnly) return;

    async function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const firstEmpty = imagesRef.current.findIndex(img => img === null);
          if (firstEmpty === -1) { alert('이미지 슬롯이 가득 찼습니다. (최대 8개)'); return; }
          e.preventDefault();
          await saveImage(firstEmpty, file);
          break;
        }
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [readOnly, productId]);

  async function saveImage(slot: number, file: File | Blob) {
    setSaving(slot);
    try {
      const dataUrl = await compressImage(file);
      setImages(prev => { const next = [...prev]; next[slot] = dataUrl; return next; });
      await fetch(`/api/products/${productId}/label-images`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, imageData: dataUrl }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  }

  async function deleteImage(slot: number) {
    setImages(prev => { const next = [...prev]; next[slot] = null; return next; });
    await fetch(`/api/products/${productId}/label-images?slot=${slot}`, { method: 'DELETE' });
  }

  const openLightbox = useCallback((src: string, index: number) => setLightbox({ src, index }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const navigateLightbox = useCallback((dir: 1 | -1) => {
    setLightbox(prev => {
      if (!prev) return null;
      const filled = imagesRef.current.map((img, i) => img ? i : -1).filter(i => i !== -1);
      const pos = filled.indexOf(prev.index);
      const next = filled[(pos + dir + filled.length) % filled.length];
      return { src: imagesRef.current[next]!, index: next };
    });
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') navigateLightbox(1);
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox, navigateLightbox]);

  function handleSlotClick(slot: number) {
    pendingSlotRef.current = slot;
    if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slot = pendingSlotRef.current;
    if (!file || slot === null) return;
    pendingSlotRef.current = null;
    saveImage(slot, file);
  }

  if (loading) return null;

  const hasAny = images.some(Boolean);
  if (readOnly && !hasAny) return null;

  return (
    <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left"
      >
        <span className="text-sm font-semibold text-slate-700">제품 표시사항</span>
        <span className="text-slate-400 text-sm">{open ? '▲ 접기' : '▼ 펼치기'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
          {!readOnly && (
            <p className="text-xs text-slate-400 mb-3">
              슬롯을 클릭해 파일 선택, 또는 캡처 후 <kbd className="bg-slate-100 border border-slate-200 rounded px-1 text-slate-500">Ctrl+V</kbd> 붙여넣기. 최대 8개.
            </p>
          )}
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, slot) => (
              <div
                key={slot}
                className="relative rounded-lg border-2 border-dashed border-slate-200 overflow-hidden bg-slate-50 group"
                style={{ aspectRatio: '4/3' }}
              >
                {saving === slot && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                    <span className="text-xs text-slate-400 animate-pulse">저장 중…</span>
                  </div>
                )}
                {img ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`표시사항 ${slot + 1}`}
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => openLightbox(img, slot)}
                    />
                    {!readOnly && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteImage(slot); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-20"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : !readOnly ? (
                  <button
                    onClick={() => handleSlotClick(slot)}
                    className="w-full h-full flex flex-col items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition"
                  >
                    <span className="text-2xl leading-none">+</span>
                    <span className="text-xs mt-1">이미지 추가</span>
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {!readOnly && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-5 text-white text-3xl leading-none hover:text-slate-300 transition"
          >
            ✕
          </button>
          {images.filter(Boolean).length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:text-slate-300 transition px-2"
              >
                ‹
              </button>
              <button
                onClick={e => { e.stopPropagation(); navigateLightbox(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:text-slate-300 transition px-2"
              >
                ›
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt="확대 보기"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
