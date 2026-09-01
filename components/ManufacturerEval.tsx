'use client';
import { useState, useRef } from 'react';

interface Props {
  productId: string;
  categoryName: string;
  initialTarget: string | null;
  initialName: string | null;
  initialLocation: string | null;
  initialNotes: string | null;
  initialCompleted: boolean;
  readOnly?: boolean;
}

const NO_DEFAULT_CATEGORIES = ['수입 화장품', '생활화학제품', '위생용품', '수입식품', '전기용품'];

const DEFAULT_NOTES: Record<string, string> = {
  '화장품': `제조사 평가 시 확인 사항 (제조사 방문 당일에 확인할 수 있도록 준비 부탁드립니다.)
• 제조공정 (생산라인 및 보관창고 현장) → 현장 입장 제한 확인, 지정 통로 통해 확인 예정
• 조직도 및 평면도
• 제조/품질관리기준서
• 원/부자재 검사성적서
• 제조관리기록서(제조지시기록서, 포장지시기록서 등)
• 품질관리기록서
• 공정점검일지(위생관리일지)
• 방충방서 관리일지
• 검교정 관리일지
• 세척소독제 관리일지
• 정제수 점검 및 관리일지
• 작업원 및 직원 교육 계획표 및 교육 일지
** 상기 사항 외 현장에서 추가 요청 사항이 생길 수도 있는 점 양해 부탁 드립니다.`,

  '가공식품': `# 제조사 평가 시 확인사항 : 아래 서류 목록은 방문 당시 현장에서 열람 할 서류 입니다.
-  제조공정 (생산라인 및 보관창고 현장)
-  (지하수 사용시) 지하수 필터/UV관리일지
-  HACCP관리기준서 또는 품질관리기준서
-  작업자 보건증 및 조직도
-  CCP관리일지
-  원료 입고검사대장
-  원재료 수불부 및 완제품 수불부
-  생산일지 (작업지시서, 칭량일지 등)
-  원산지 관리 서류 (원산지증명원, 거래명세서)
-  방충방서 관리일지
-  작업장,보관창고 온도관리
-  공정 점검 일지
-  검교정 관리일지
-  세척소독제 관리일지
** 상기 사항 외 현장에서 추가 요청 사항이 생길 수도 있는 점 양해 부탁 드립니다.`,

  '건강기능식품': `# 제조사 평가 시 확인사항 : 아래 서류 목록은 방문 당시 현장에서 열람 할 서류 입니다.
-  제조공정 (생산라인 및 보관창고 현장)
-  용수 관리 일지 (지하수 필터/UV관리일지/정제수관리일지 등)
-  GMP 기준서
-  작업자 보건증 및 조직도
-  제조표준서 / 제조지시기록서
-  원료 입고검사대장
-  원재료 수불부 및 완제품 수불부
-  원산지 관리 서류 (원산지증명원, 거래명세서)
-  방충방서 관리일지
-  작업장,보관창고 온도관리
-  공정 점검 일지
-  검교정 관리일지
-  세척소독제 관리일지
-  성적서 관리대장
그 外 추가로 필요한 사항 있을 시 추가 요청 드릴 수 있습니다. 이점 양해 부탁 드립니다`,
};

function getDefaultNotes(categoryName: string): string {
  return DEFAULT_NOTES[categoryName] ?? '';
}

export default function ManufacturerEval({
  productId, categoryName,
  initialTarget, initialName, initialLocation, initialNotes, initialCompleted,
  readOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<'target' | 'non_target' | null>(
    initialTarget === 'target' ? 'target' : initialTarget === 'non_target' ? 'non_target' : null
  );
  const [mfrName, setMfrName] = useState(initialName ?? '');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [completed, setCompleted] = useState(initialCompleted);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasNoDefault = NO_DEFAULT_CATEGORIES.includes(categoryName);

  async function save(overrides?: Partial<{ target: string | null; mfrName: string; location: string; notes: string; completed: boolean }>) {
    const payload = {
      mfrEvalTarget: overrides?.target !== undefined ? overrides.target : target,
      mfrEvalName: overrides?.mfrName !== undefined ? overrides.mfrName : mfrName,
      mfrEvalLocation: overrides?.location !== undefined ? overrides.location : location,
      mfrEvalNotes: overrides?.notes !== undefined ? overrides.notes : notes,
      mfrEvalCompleted: overrides?.completed !== undefined ? overrides.completed : completed,
    };
    await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  function handleTargetChange(val: 'target' | 'non_target') {
    const newTarget = target === val ? null : val;
    let newNotes = notes;
    if (val === 'target' && newTarget === 'target' && !notes) {
      newNotes = getDefaultNotes(categoryName);
      setNotes(newNotes);
    }
    setTarget(newTarget);
    save({ target: newTarget, notes: newNotes });
  }

  return (
    <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">제조사 평가</span>
          {target === 'target' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">대상</span>}
          {target === 'target' && completed && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ 완료</span>}
          {target === 'non_target' && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">비대상</span>}
          {mfrName && <span className="text-xs text-slate-400">— {mfrName}</span>}
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲ 접기' : '▼ 펼치기'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* 대상 / 비대상 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">구분</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={target === 'target'}
                  onChange={() => !readOnly && handleTargetChange('target')}
                  disabled={readOnly}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">대상</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={target === 'non_target'}
                  onChange={() => !readOnly && handleTargetChange('non_target')}
                  disabled={readOnly}
                  className="w-4 h-4 accent-slate-500"
                />
                <span className="text-sm text-slate-700">비대상 (제외/면제)</span>
              </label>
              {target === 'target' && !readOnly && (
                <label className="flex items-center gap-2 cursor-pointer select-none ml-4 pl-4 border-l border-slate-200">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => {
                      const next = !completed;
                      setCompleted(next);
                      save({ completed: next });
                    }}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-emerald-700">완료</span>
                </label>
              )}
            </div>
          </div>

          {/* 제조사명 / 소재지 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">제조사명</label>
              {readOnly ? (
                <p className="text-sm text-slate-700">{mfrName || '-'}</p>
              ) : (
                <input
                  value={mfrName}
                  onChange={e => setMfrName(e.target.value)}
                  onBlur={() => save()}
                  placeholder="제조사명 입력"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">소재지</label>
              {readOnly ? (
                <p className="text-sm text-slate-700">{location || '-'}</p>
              ) : (
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onBlur={() => save()}
                  placeholder="소재지 입력"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              )}
            </div>
          </div>

          {/* 평가 내용 (대상이고 완료 아닌 경우에만) */}
          {target === 'target' && !completed && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500">평가 확인 사항</label>
                {!readOnly && !hasNoDefault && !notes && (
                  <button
                    onClick={() => { const d = getDefaultNotes(categoryName); setNotes(d); save({ notes: d }); }}
                    className="text-xs text-blue-500 hover:text-blue-700 transition"
                  >
                    기본값 불러오기
                  </button>
                )}
              </div>
              {readOnly ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">{notes || '-'}</pre>
              ) : (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={() => save()}
                  rows={14}
                  placeholder={hasNoDefault ? '평가 확인 사항을 입력하세요.' : '내용을 입력하거나 기본값을 불러오세요.'}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 resize-y font-mono leading-relaxed"
                />
              )}
            </div>
          )}

          {!readOnly && (
            <div className="flex justify-end">
              <span className={`text-xs transition ${saved ? 'text-emerald-500' : 'text-transparent'}`}>✓ 저장됨</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
