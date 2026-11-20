'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  targetId: string;
  filename?: string;
  productId?: string;
  shareToken?: string;
  records?: Array<{ status: string }>;
}

type Mode = 'all' | 'pending';
type CaptureStatus = 'idle' | 'capturing' | 'done' | 'error' | 'no-token';

export default function CaptureImageButton({ filename = 'QA_체크리스트', productId, shareToken, records = [] }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false);
    }
    if (showModal) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal]);

  const pendingCount = records.filter(r =>
    r.status === '미완료' || r.status === '진행중' || r.status === '보류'
  ).length;

  async function capture(mode: Mode, action: 'download' | 'copy', withNotes: boolean) {
    setActiveKey(`${mode}-${action}`);
    setStatus('capturing');
    setShowModal(false);

    let screenshotUrl: string;
    if (productId) {
      const qs = new URLSearchParams();
      if (mode === 'pending') qs.set('filter', 'pending');
      if (withNotes) qs.set('includeNotes', 'true');
      const qStr = qs.toString();
      screenshotUrl = `/api/products/${productId}/screenshot${qStr ? `?${qStr}` : ''}`;
    } else if (shareToken) {
      const qs = new URLSearchParams();
      if (mode === 'pending') qs.set('filter', 'pending');
      if (withNotes) qs.set('includeNotes', 'true');
      const qStr = qs.toString();
      screenshotUrl = `/api/share/${shareToken}/screenshot${qStr ? `?${qStr}` : ''}`;
    } else {
      setStatus('error');
      setTimeout(() => { setStatus('idle'); setActiveKey(null); }, 3000);
      return;
    }

    try {
      if (action === 'copy') {
        // Pass a Promise directly to ClipboardItem so it registers within the user gesture
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': fetch(screenshotUrl).then(async res => {
              if (!res.ok) throw new Error(res.statusText);
              return res.blob();
            }),
          }),
        ]);
      } else {
        const res = await fetch(screenshotUrl);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          const msg = err.error || res.statusText;
          if (res.status === 400 && msg.includes('share token')) {
            setStatus('no-token');
            setTimeout(() => setStatus('idle'), 5000);
            return;
          }
          throw new Error(msg);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}${mode === 'pending' ? '_미완료진행중보류' : ''}${withNotes ? '_메모포함' : ''}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }

      setStatus('done');
      setTimeout(() => { setStatus('idle'); setActiveKey(null); }, 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => { setStatus('idle'); setActiveKey(null); }, 3000);
    }
  }

  const triggerButton = (
    <button
      onClick={() => setShowModal(true)}
      disabled={status === 'capturing'}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${
        status === 'capturing' ? 'border-blue-200 bg-blue-50 text-blue-500 cursor-wait' :
        status === 'done'      ? 'border-emerald-300 bg-emerald-50 text-emerald-600' :
        status === 'error'     ? 'border-red-300 bg-red-50 text-red-600' :
        'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {status === 'capturing' ? <><span className="inline-block animate-spin">⟳</span> 캡처 중...</> :
       status === 'done'      ? '✓ 완료' :
       status === 'error'     ? '✕ 오류' :
       '🖼 이미지 저장'}
    </button>
  );

  if (status === 'no-token') {
    return (
      <div className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 max-w-xs">
        ⚠ 먼저 공유 링크를 생성해주세요.
      </div>
    );
  }

  return (
    <>
      {triggerButton}

      {showModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          style={{ paddingTop: '72px', paddingBottom: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-auto"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
          >
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">이미지 저장</h2>
                  <p className="text-xs text-slate-400 mt-0.5">저장할 항목 범위를 선택하세요</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-300 hover:text-slate-500 transition text-lg leading-none"
                >✕</button>
              </div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-3">
              <div className="border rounded-xl border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">전체 항목</div>
                    <div className="text-xs text-slate-400">완료·진행중·미완료·해당없음 포함 · 총 {records.length}개</div>
                  </div>
                </div>
                <div className="flex divide-x divide-slate-100">
                  <button
                    onClick={() => capture('all', 'download', includeNotes)}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-center gap-1.5"
                  >
                    ⬇ PNG 다운로드
                  </button>
                  <button
                    onClick={() => capture('all', 'copy', includeNotes)}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-center gap-1.5"
                  >
                    📋 클립보드 복사
                  </button>
                </div>
              </div>

              {/* 상품확인정보 포함 토글 */}
              <div
                className="flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-50 transition"
                onClick={() => setIncludeNotes(v => !v)}
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">상품확인정보 포함</div>
                  <div className="text-xs text-slate-400">이미지에 상품확인정보 내용 추가</div>
                </div>
                <div className={`relative w-10 h-6 rounded-full transition-colors ${includeNotes ? 'bg-violet-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${includeNotes ? 'left-5' : 'left-1'}`} />
                </div>
              </div>

              <div className="border rounded-xl border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-amber-50/60 border-b border-amber-100 flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">미완료 · 진행중 · 보류만</div>
                    <div className="text-xs text-slate-400">
                      처리 필요 항목만 추출 ·{' '}
                      <span className={pendingCount > 0 ? 'text-amber-600 font-semibold' : ''}>{pendingCount}개</span>
                    </div>
                  </div>
                </div>
                <div className="flex divide-x divide-slate-100">
                  <button
                    onClick={() => capture('pending', 'download', includeNotes)}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition flex items-center justify-center gap-1.5"
                  >
                    ⬇ PNG 다운로드
                  </button>
                  <button
                    onClick={() => capture('pending', 'copy', includeNotes)}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition flex items-center justify-center gap-1.5"
                  >
                    📋 클립보드 복사
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pb-5">
              <p className="text-xs text-slate-300 text-center">PNG 형식으로 저장됩니다</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
