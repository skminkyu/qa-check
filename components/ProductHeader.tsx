'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Props {
  productId: string;
  initialName: string;
  initialPartnerName: string;
  initialMdName: string;
  initialContactEmail: string;
  initialCcEmail: string;
  initialRecordingDate: string;
  initialBroadcastDate: string;
  categoryName: string;
  createdAt: string;
  readOnly: boolean;
}

function DdayBadge({ date, label }: { date: string; label: string }) {
  if (!date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const urgent = diff >= 0 && diff <= 3;
  const past = diff < 0;
  const label2 = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${past ? 'bg-gray-100 text-gray-400' : urgent ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600'}`}>
      {label} {label2}
    </span>
  );
}

export default function ProductHeader({
  productId, initialName, initialPartnerName, initialMdName,
  initialContactEmail, initialCcEmail,
  initialRecordingDate, initialBroadcastDate,
  categoryName, createdAt, readOnly,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [partnerName, setPartnerName] = useState(initialPartnerName);
  const [mdName, setMdName] = useState(initialMdName);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [ccEmail, setCcEmail] = useState(initialCcEmail);
  const [recordingDate, setRecordingDate] = useState(initialRecordingDate);
  const [broadcastDate, setBroadcastDate] = useState(initialBroadcastDate);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, partnerName, mdName,
        contactEmail: contactEmail || null,
        ccEmail: ccEmail || null,
        recordingDate: recordingDate || null,
        broadcastDate: broadcastDate || null,
      }),
    });
    setSaving(false);
    setEditing(false);
  }

  function cancel() {
    setName(initialName); setPartnerName(initialPartnerName); setMdName(initialMdName);
    setContactEmail(initialContactEmail); setCcEmail(initialCcEmail);
    setRecordingDate(initialRecordingDate); setBroadcastDate(initialBroadcastDate);
    setEditing(false);
  }

  const toEmails = contactEmail.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes('@'));
  const ccEmails = ccEmail.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes('@'));

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link href="/dashboard" className="hover:text-slate-700">대시보드</Link>
        <span>/</span>
        <span>{name}</span>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-2xl font-bold text-slate-800 border-b-2 border-blue-400 focus:outline-none bg-transparent w-full max-w-xl"
            placeholder="상품명"
          />
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-500 shrink-0">협력사:</span>
              <input value={partnerName} onChange={e => setPartnerName(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-40" placeholder="협력사명" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-500 shrink-0">MD:</span>
              <input value={mdName} onChange={e => setMdName(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-32" placeholder="MD 이름" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-500 shrink-0">녹화 예정일:</span>
              <input type="date" value={recordingDate} onChange={e => setRecordingDate(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-500 shrink-0">송출 예정일:</span>
              <input type="date" value={broadcastDate} onChange={e => setBroadcastDate(e.target.value)}
                className="text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          {/* 이메일 입력 */}
          <div className="flex flex-col gap-2 max-w-xl bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1">이메일 발송 설정</div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">수신 (To) — 여러 명은 쉼표로 구분</label>
              <textarea
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                rows={2}
                className="text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                placeholder="a@company.com, b@company.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">참조 (CC) — 여러 명은 쉼표로 구분</label>
              <textarea
                value={ccEmail}
                onChange={e => setCcEmail(e.target.value)}
                rows={2}
                className="text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                placeholder="c@company.com, d@company.com"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="text-sm bg-slate-800 text-white px-4 py-1.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={cancel}
              className="text-sm border border-slate-300 text-slate-600 px-4 py-1.5 rounded-lg hover:bg-slate-50 transition">
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{name}</h1>
            <div className="flex gap-4 mt-2 text-sm text-slate-500 flex-wrap items-center">
              <span>카테고리: <strong className="text-slate-700">{categoryName}</strong></span>
              {partnerName && <span>협력사: <strong className="text-slate-700">{partnerName}</strong></span>}
              {mdName && <span>MD: <strong className="text-slate-700">{mdName}</strong></span>}
              {toEmails.length > 0 && (
                <span className="flex items-center gap-1 flex-wrap">
                  <span className="text-slate-400">수신:</span>
                  {toEmails.map(e => (
                    <a key={e} href={`mailto:${e}`} className="text-blue-600 hover:underline font-medium">{e}</a>
                  ))}
                </span>
              )}
              {ccEmails.length > 0 && (
                <span className="flex items-center gap-1 flex-wrap">
                  <span className="text-slate-400">참조:</span>
                  {ccEmails.map(e => (
                    <a key={e} href={`mailto:${e}`} className="text-slate-500 hover:underline">{e}</a>
                  ))}
                </span>
              )}
              <span>등록일: {createdAt.slice(0, 10)}</span>
              {recordingDate && (
                <span className="flex items-center gap-1">
                  🎬 녹화: <strong className="text-slate-700">{recordingDate}</strong>
                  <DdayBadge date={recordingDate} label="녹화" />
                </span>
              )}
              {broadcastDate && (
                <span className="flex items-center gap-1">
                  📺 송출: <strong className="text-slate-700">{broadcastDate}</strong>
                  <DdayBadge date={broadcastDate} label="송출" />
                </span>
              )}
            </div>
          </div>
          {!readOnly && (
            <button onClick={() => setEditing(true)}
              className="mt-1 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 transition shrink-0">
              ✏ 편집
            </button>
          )}
        </div>
      )}
    </div>
  );
}
