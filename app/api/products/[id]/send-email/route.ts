import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Resend } from 'resend';

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  '완료':    { label: '완료',    bg: '#d1fae5', color: '#065f46' },
  '진행중':  { label: '진행중',  bg: '#dbeafe', color: '#1e40af' },
  '보류':    { label: '보류',    bg: '#fef3c7', color: '#92400e' },
  '해당없음':{ label: '해당없음',bg: '#f1f5f9', color: '#64748b' },
  '미완료':  { label: '미완료',  bg: '#f1f5f9', color: '#94a3b8' },
};

function calcDday(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseEmails(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes('@'));
}

function textCell(text: string): string {
  if (!text) return '<span style="color:#94a3b8;font-size:12px;">-</span>';
  return `<span style="white-space:pre-wrap;font-size:13px;color:#334155;line-height:1.6;">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id) as {
    id: string; name: string; category_name: string; partner_name: string; md_name: string;
    contact_email: string; cc_email: string; product_notes: string; created_at: string;
    recording_date: string; broadcast_date: string;
  } | undefined;

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const toList = parseEmails(product.contact_email || '');
  if (toList.length === 0) return NextResponse.json({ error: '담당자 이메일이 없습니다.' }, { status: 400 });
  const ccList = parseEmails(product.cc_email || '');

  const records = db.prepare(`
    SELECT t.item_name, t.standard, t.sort_order,
      COALESCE(r.status, '미완료') as status, r.qa_notes, r.standard_notes, r.due_date
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(id, id) as Array<{
    item_name: string; standard: string; sort_order: number;
    status: string; qa_notes: string; standard_notes: string; due_date: string;
  }>;

  const doneCount = records.filter(r => r.status === '완료').length;
  const naCount = records.filter(r => r.status === '해당없음').length;
  const effective = records.length - naCount;
  const pct = effective > 0 ? Math.round((doneCount / effective) * 100) : 0;

  const pctBarWidth = pct;
  const pctColor = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';

  const rdDay = product.recording_date ? `${product.recording_date}  ${calcDday(product.recording_date)}` : '-';
  const bdDay = product.broadcast_date ? `${product.broadcast_date}  ${calcDday(product.broadcast_date)}` : '-';
  const notes = htmlToText(product.product_notes || '');

  const recordCards = records.map((r, i) => {
    const st = STATUS_STYLE[r.status] || STATUS_STYLE['미완료'];
    const qaNotes = htmlToText(r.qa_notes || '');
    const stdNotes = htmlToText(r.standard_notes || '');
    const stdText = htmlToText(r.standard || '');
    const isNa = r.status === '해당없음';
    return `
    <div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;${isNa ? 'opacity:0.6;' : ''}">
      <!-- 항목 헤더 -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:11px;color:#94a3b8;font-weight:600;min-width:20px;">${i + 1}</span>
          <span style="font-size:14px;font-weight:600;color:#1e293b;">${r.item_name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${r.due_date ? `<span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:4px;">완료예정 ${r.due_date}</span>` : ''}
          <span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:${st.bg};color:${st.color};">${st.label}</span>
        </div>
      </div>
      <!-- 내용 -->
      <div style="padding:0;">
        ${stdText ? `
        <div style="padding:10px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;">
          <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">기준</div>
          ${textCell(stdText)}
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;">
          <div style="padding:12px 16px;border-right:1px solid #f1f5f9;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;">QA 확인사항</div>
            ${textCell(qaNotes)}
          </div>
          <div style="padding:12px 16px;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;">기준 및 QA 의견</div>
            ${textCell(stdNotes)}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
<div style="max-width:720px;margin:28px auto;background:#fff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

  <!-- 헤더 -->
  <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 32px 24px;">
    <div style="font-size:11px;color:#93c5fd;letter-spacing:0.08em;margin-bottom:6px;">QA 체크 시스템</div>
    <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${product.name}</div>
    <div style="font-size:12px;color:#bfdbfe;margin-top:4px;">${product.category_name}${product.partner_name ? ' · ' + product.partner_name : ''}</div>
  </div>

  <!-- 진척률 바 -->
  <div style="padding:16px 32px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <span style="font-size:12px;font-weight:600;color:#475569;">QA 진척률</span>
      <span style="font-size:14px;font-weight:700;color:${pctColor};">${doneCount} / ${records.length} 항목 (${pct}%)</span>
    </div>
    <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
      <div style="background:${pctColor};height:8px;width:${pctBarWidth}%;border-radius:99px;"></div>
    </div>
  </div>

  <!-- 상품 정보 -->
  <div style="padding:16px 32px;border-bottom:1px solid #e2e8f0;">
    <table style="border-collapse:collapse;width:100%;">
      <tr>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">MD</td>
        <td style="padding:5px 32px 5px 0;font-size:13px;color:#1e293b;font-weight:500;">${product.md_name || '-'}</td>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">🎬 녹화 예정</td>
        <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:500;">${rdDay}</td>
      </tr>
      <tr>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">협력사</td>
        <td style="padding:5px 32px 5px 0;font-size:13px;color:#1e293b;font-weight:500;">${product.partner_name || '-'}</td>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">📺 송출 예정</td>
        <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:500;">${bdDay}</td>
      </tr>
    </table>
  </div>

  <!-- QA 체크리스트 -->
  <div style="padding:24px 32px;">
    <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0;">
      QA 체크리스트
    </div>
    ${recordCards}
  </div>

  ${notes ? `
  <!-- 상품확인정보 -->
  <div style="padding:0 32px 28px;">
    <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">상품확인정보</div>
    <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;white-space:pre-wrap;line-height:1.7;">${notes.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  </div>` : ''}

  <!-- 푸터 -->
  <div style="padding:14px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
    <div style="font-size:11px;color:#94a3b8;">QA 체크 시스템 · 자동 발송 이메일입니다</div>
  </div>

</div>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY가 설정되지 않았습니다.' }, { status: 500 });

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || 'QA체크시스템 <onboarding@resend.dev>';

  const sendOpts: Parameters<typeof resend.emails.send>[0] = {
    from: fromEmail,
    to: toList,
    subject: `[QA 체크] ${product.name} — 진척률 ${pct}%`,
    html,
  };
  if (ccList.length > 0) sendOpts.cc = ccList;

  const { error } = await resend.emails.send(sendOpts);
  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, to: toList, cc: ccList });
}
