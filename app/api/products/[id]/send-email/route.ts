import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Resend } from 'resend';

const STATUS_KR: Record<string, string> = {
  '완료': '✅ 완료',
  '진행중': '🔄 진행중',
  '보류': '⏸ 보류',
  '해당없음': '➖ 해당없음',
  '미완료': '⬜ 미완료',
};

function calcDday(dateStr: string): string {
  if (!dateStr) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function stripHtml(html: string): string {
  return html ? html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
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
    contact_email: string; product_notes: string; created_at: string;
    recording_date: string; broadcast_date: string;
  } | undefined;

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!product.contact_email) return NextResponse.json({ error: '담당자 이메일이 없습니다.' }, { status: 400 });

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

  const recordRows = records.map(r => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:8px 12px;font-size:13px;color:#334155;">${r.item_name}</td>
      <td style="padding:8px 12px;font-size:12px;color:#64748b;">${stripHtml(r.standard || '')}</td>
      <td style="padding:8px 12px;font-size:12px;white-space:nowrap;">${STATUS_KR[r.status] || r.status}</td>
      <td style="padding:8px 12px;font-size:12px;color:#334155;">${stripHtml(r.qa_notes || '')}</td>
      <td style="padding:8px 12px;font-size:12px;color:#334155;">${stripHtml(r.standard_notes || '')}</td>
      <td style="padding:8px 12px;font-size:12px;color:#64748b;white-space:nowrap;">${r.due_date || ''}</td>
    </tr>
  `).join('');

  const rdDay = product.recording_date ? `${product.recording_date} (${calcDday(product.recording_date)})` : '-';
  const bdDay = product.broadcast_date ? `${product.broadcast_date} (${calcDday(product.broadcast_date)})` : '-';
  const notes = stripHtml(product.product_notes || '');

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:800px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <!-- Header -->
    <div style="background:#1e40af;padding:24px 32px;">
      <div style="font-size:12px;color:#93c5fd;margin-bottom:4px;">QA 체크 시스템</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">${product.name}</div>
    </div>
    <!-- Info -->
    <div style="padding:20px 32px;border-bottom:1px solid #e2e8f0;background:#f8fafc;">
      <table style="border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:12px;color:#64748b;white-space:nowrap;">카테고리</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${product.category_name}</td>
          <td style="padding:4px 16px 4px 32px;font-size:12px;color:#64748b;white-space:nowrap;">협력사</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${product.partner_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:12px;color:#64748b;">MD</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${product.md_name || '-'}</td>
          <td style="padding:4px 16px 4px 32px;font-size:12px;color:#64748b;">진척률</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${doneCount}/${records.length} (${pct}%)</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:12px;color:#64748b;">🎬 녹화 예정</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${rdDay}</td>
          <td style="padding:4px 16px 4px 32px;font-size:12px;color:#64748b;">📺 송출 예정</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1e293b;">${bdDay}</td>
        </tr>
      </table>
    </div>
    <!-- QA Table -->
    <div style="padding:24px 32px;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;">QA 체크리스트</div>
      <div style="overflow-x:auto;">
        <table style="border-collapse:collapse;width:100%;min-width:600px;">
          <thead>
            <tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">QA항목</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">기준</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">상태</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">QA 확인사항</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">기준 및 QA 의견</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#475569;font-weight:600;">완료예정일</th>
            </tr>
          </thead>
          <tbody>${recordRows}</tbody>
        </table>
      </div>
    </div>
    ${notes ? `
    <div style="padding:0 32px 24px;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:8px;">상품확인정보</div>
      <div style="font-size:13px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;white-space:pre-wrap;">${notes}</div>
    </div>` : ''}
    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center;">
      <div style="font-size:11px;color:#94a3b8;">QA 체크 시스템 | 이 이메일은 자동 발송되었습니다.</div>
    </div>
  </div>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY가 설정되지 않았습니다.' }, { status: 500 });

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || 'QA체크시스템 <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: product.contact_email,
    subject: `[QA 체크] ${product.name} - 진척률 ${pct}%`,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
