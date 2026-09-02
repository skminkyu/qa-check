import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Resend } from 'resend';

function parseEmails(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes('@'));
}

// Count N business days (Mon-Fri) forward from today; return that date as YYYY-MM-DD
function addBusinessDays(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const db = getDb();
  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || 'QA체크시스템 <onboarding@resend.dev>';

  // D-5 business day target date
  const d5date = addBusinessDays(5);

  // Get products where recording_date or broadcast_date equals d5date and contact_email exists
  const products = db.prepare(`
    SELECT p.id, p.name, p.contact_email, p.cc_email,
      p.recording_date, p.broadcast_date,
      p.category_id
    FROM products p
    WHERE p.contact_email IS NOT NULL AND p.contact_email != ''
      AND (p.recording_date = ? OR p.broadcast_date = ?)
  `).all(d5date, d5date) as Array<{
    id: string; name: string; contact_email: string; cc_email: string;
    recording_date: string; broadcast_date: string; category_id: string;
  }>;

  const results: Array<{ product: string; status: string; reason?: string }> = [];

  for (const product of products) {
    const toList = parseEmails(product.contact_email);
    if (toList.length === 0) continue;

    // Check QA progress
    const records = db.prepare(`
      SELECT COALESCE(r.status, '미완료') as status
      FROM qa_templates t
      LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
      WHERE t.category_id = ?
    `).all(product.id, product.category_id) as Array<{ status: string }>;

    const doneCount = records.filter(r => r.status === '완료').length;
    const naCount = records.filter(r => r.status === '해당없음').length;
    const effective = records.length - naCount;
    const pct = effective > 0 ? Math.round((doneCount / effective) * 100) : 0;

    if (pct >= 100) {
      results.push({ product: product.name, status: 'skipped', reason: '100% complete' });
      continue;
    }

    // Get share token for this product
    const shareRow = db.prepare('SELECT token FROM share_tokens WHERE product_id = ?').get(product.id) as { token: string } | undefined;
    const shareUrl = shareRow
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://qa-check.up.railway.app'}/share/${shareRow.token}`
      : '';

    // Build which dates are D-5
    const dateLines: string[] = [];
    if (product.recording_date === d5date) dateLines.push('녹화일');
    if (product.broadcast_date === d5date) dateLines.push('송출일');
    const datePart = dateLines.join(' / ');

    const subject = `[REMIND] "${product.name}" QA 진행 리마인드 안내 건`;
    const text = `안녕하세요. SK스토아 품질관리팀 김민규입니다.

"${product.name}" ${datePart} D-5 도래 QA 진행 리마인드 안내 드립니다.

[공유 읽기전용 링크]
${shareUrl}
상기 링크 참고하시어 미비 사항 확인 후 회신 부탁드립니다.

본 메일은 시스템상 자동 발송 메일입니다. 회신 시 skyminkk@sk.com 메일로 내용 회신 바랍니다.`;

    const ccList = parseEmails(product.cc_email || '');
    const sendOpts: Parameters<typeof resend.emails.send>[0] = {
      from: fromEmail,
      to: toList,
      subject,
      text,
    };
    if (ccList.length > 0) sendOpts.cc = ccList;

    const { error } = await resend.emails.send(sendOpts);
    if (error) {
      console.error('Resend error for', product.name, error);
      results.push({ product: product.name, status: 'error', reason: String(error) });
    } else {
      results.push({ product: product.name, status: 'sent', reason: `to: ${toList.join(', ')}` });
    }
  }

  return NextResponse.json({ d5date, checked: products.length, results });
}
