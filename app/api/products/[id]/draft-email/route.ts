import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

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

function esc(s: string): string {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function textCell(text: string): string {
  if (!text) return '<span style="color:#94a3b8;font-size:12px;">-</span>';
  return `<span style="white-space:pre-wrap;font-size:13px;color:#334155;line-height:1.6;">${esc(text)}</span>`;
}

function encodeEmlHeader(str: string): string {
  // RFC 2047 encoded-word for non-ASCII subject/from
  const encoded = Buffer.from(str, 'utf-8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const pctColor = pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b';

  const rdDay = product.recording_date ? `${product.recording_date}  (${calcDday(product.recording_date)})` : '-';
  const bdDay = product.broadcast_date ? `${product.broadcast_date}  (${calcDday(product.broadcast_date)})` : '-';
  const notes = htmlToText(product.product_notes || '');

  const recordCards = records.map((r, i) => {
    const st = STATUS_STYLE[r.status] || STATUS_STYLE['미완료'];
    const qaNotes = htmlToText(r.qa_notes || '');
    const stdNotes = htmlToText(r.standard_notes || '');
    const stdText = htmlToText(r.standard || '');
    const isNa = r.status === '해당없음';
    return `
    <div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;${isNa ? 'opacity:0.6;' : ''}">
      <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <table style="border-collapse:collapse;width:100%;"><tr>
          <td style="vertical-align:middle;">
            <span style="font-size:11px;color:#94a3b8;font-weight:600;margin-right:8px;">${i + 1}</span>
            <span style="font-size:14px;font-weight:600;color:#1e293b;">${esc(r.item_name)}</span>
          </td>
          <td style="text-align:right;white-space:nowrap;vertical-align:middle;">
            ${r.due_date ? `<span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:4px;margin-right:6px;">완료예정 ${r.due_date}</span>` : ''}
            <span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:${st.bg};color:${st.color};">${st.label}</span>
          </td>
        </tr></table>
      </div>
      <div>
        ${stdText ? `
        <div style="padding:10px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;">
          <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px;">기준</div>
          ${textCell(stdText)}
        </div>` : ''}
        <table style="border-collapse:collapse;width:100%;"><tr>
          <td style="width:50%;padding:12px 16px;vertical-align:top;border-right:1px solid #f1f5f9;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;">QA 확인사항</div>
            ${textCell(qaNotes)}
          </td>
          <td style="width:50%;padding:12px 16px;vertical-align:top;">
            <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px;">기준 및 QA 의견</div>
            ${textCell(stdNotes)}
          </td>
        </tr></table>
      </div>
    </div>`;
  }).join('');

  const htmlBody = `
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">

<!-- 인사말 영역 (발송 전 수정) -->
<div style="max-width:720px;margin:0 auto 16px;padding:16px 20px;background:#fffde7;border:1px solid #f59e0b;border-radius:8px;font-size:13px;color:#78350f;">
  ⚠️ <strong>이 영역을 지우고 인사말을 입력하세요.</strong> (예: 안녕하세요 SK스토아 품질관리팀 김민규 입니다. ...)
</div>

<div style="max-width:720px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">

  <!-- 헤더 -->
  <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:28px 32px 24px;">
    <div style="font-size:11px;color:#93c5fd;letter-spacing:0.08em;margin-bottom:6px;">QA 체크 시스템</div>
    <div style="font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${esc(product.name)}</div>
    <div style="font-size:12px;color:#bfdbfe;margin-top:4px;">${esc(product.category_name)}${product.partner_name ? ' · ' + esc(product.partner_name) : ''}</div>
  </div>

  <!-- 진척률 바 -->
  <div style="padding:16px 32px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
    <table style="border-collapse:collapse;width:100%;margin-bottom:8px;"><tr>
      <td style="font-size:12px;font-weight:600;color:#475569;">QA 진척률</td>
      <td style="text-align:right;font-size:14px;font-weight:700;color:${pctColor};">${doneCount} / ${records.length} 항목 (${pct}%)</td>
    </tr></table>
    <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
      <div style="background:${pctColor};height:8px;width:${pct}%;border-radius:99px;"></div>
    </div>
  </div>

  <!-- 상품 정보 -->
  <div style="padding:16px 32px;border-bottom:1px solid #e2e8f0;">
    <table style="border-collapse:collapse;width:100%;">
      <tr>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">MD</td>
        <td style="padding:5px 32px 5px 0;font-size:13px;color:#1e293b;font-weight:500;">${esc(product.md_name || '-')}</td>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">🎬 녹화 예정</td>
        <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:500;">${rdDay}</td>
      </tr>
      <tr>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">협력사</td>
        <td style="padding:5px 32px 5px 0;font-size:13px;color:#1e293b;font-weight:500;">${esc(product.partner_name || '-')}</td>
        <td style="padding:5px 20px 5px 0;font-size:11px;color:#94a3b8;font-weight:600;white-space:nowrap;vertical-align:top;">📺 송출 예정</td>
        <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:500;">${bdDay}</td>
      </tr>
    </table>
  </div>

  <!-- QA 체크리스트 -->
  <div style="padding:24px 32px;">
    <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0;">QA 체크리스트</div>
    ${recordCards}
  </div>

  ${notes ? `
  <div style="padding:0 32px 28px;">
    <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">상품확인정보</div>
    <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;white-space:pre-wrap;line-height:1.7;">${esc(notes)}</div>
  </div>` : ''}

  <div style="padding:14px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
    <div style="font-size:11px;color:#94a3b8;">QA 체크 시스템 · 자동 생성 초안</div>
  </div>

</div>
</body>
</html>`;

  // Build .eml
  const boundary = `----=_Part_${Date.now()}`;
  const subject = `[QA 체크] ${product.name} — 진척률 ${pct}%`;
  const subjectEncoded = encodeEmlHeader(subject);

  const toHeader = toList.length > 0 ? toList.join(', ') : '';
  const ccHeader = ccList.length > 0 ? ccList.join(', ') : '';
  const htmlB64 = Buffer.from(htmlBody, 'utf-8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';

  // Build headers without any blank lines between them
  const headers: string[] = [
    'MIME-Version: 1.0',
    `Subject: ${subjectEncoded}`,
  ];
  if (toHeader) headers.push(`To: ${toHeader}`);
  if (ccHeader) headers.push(`Cc: ${ccHeader}`);
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const eml = [
    ...headers,
    '',  // single blank line separating headers from body (RFC 2822)
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const filename = `QA_${product.name.replace(/[^\w가-힣]/g, '_')}.eml`;

  return new NextResponse(eml, {
    headers: {
      'Content-Type': 'message/rfc822',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
