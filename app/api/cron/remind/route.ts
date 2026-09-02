import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Resend } from 'resend';

function parseEmails(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[,;\n]/).map(e => e.trim()).filter(e => e.includes('@'));
}

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

async function sendRemindEmail(product: {
  id: string; name: string; contact_email: string; cc_email: string;
  recording_date: string; broadcast_date: string; category_id: string;
}, datePart: string) {
  const db = getDb();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: 'RESEND_API_KEY not set' };

  const resend = new Resend(apiKey);
  const fromEmail = process.env.FROM_EMAIL || 'QA체크시스템 <onboarding@resend.dev>';

  const toList = parseEmails(product.contact_email);
  if (toList.length === 0) return { error: '수신인 없음' };

  const shareRow = db.prepare('SELECT token FROM share_tokens WHERE product_id = ?').get(product.id) as { token: string } | undefined;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qa-check.up.railway.app';
  const shareUrl = shareRow ? `${baseUrl}/share/${shareRow.token}` : '';

  const subject = `[REMIND] "${product.name}" QA 진행 리마인드 안내 건`;
  const text = `안녕하세요. SK스토아 품질관리팀 김민규입니다.

"${product.name}" ${datePart} D-5 도래 QA 진행 리마인드 안내 드립니다.

${shareUrl}
상기 링크 참고하시어 미비 사항 확인 후 회신 부탁드립니다.

본 메일은 시스템상 자동 발송 메일입니다. 회신 시 skyminkk@sk.com 메일로 내용 회신 바랍니다.`;

  const ccList = parseEmails(product.cc_email || '');
  const sendOpts: Parameters<typeof resend.emails.send>[0] = { from: fromEmail, to: toList, subject, text };
  if (ccList.length > 0) sendOpts.cc = ccList;

  const { error } = await resend.emails.send(sendOpts);
  return error ? { error: String(error) } : { ok: true, to: toList, cc: ccList };
}

// POST /api/cron/remind — cron 자동 실행 (D-5 체크)
// POST /api/cron/remind?productId=xxx — 특정 제품 강제 발송 (로그인 필요)
export async function POST(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  // 특정 제품 강제 발송 (브라우저에서 로그인 상태로 호출)
  if (productId) {
    const session = await getSession();
    if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const product = db.prepare(`
      SELECT p.id, p.name, p.contact_email, p.cc_email,
        p.recording_date, p.broadcast_date, p.category_id
      FROM products p WHERE p.id = ?
    `).get(productId) as { id: string; name: string; contact_email: string; cc_email: string; recording_date: string; broadcast_date: string; category_id: string; } | undefined;

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!product.contact_email) return NextResponse.json({ error: '수신인 이메일이 없습니다.' }, { status: 400 });

    const dateParts: string[] = [];
    if (product.recording_date) dateParts.push('녹화일');
    if (product.broadcast_date) dateParts.push('송출일');
    const result = await sendRemindEmail(product, dateParts.join(' / '));
    return NextResponse.json(result);
  }

  // 자동 cron 실행 (CRON_SECRET 체크)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const d5date = addBusinessDays(5);
  const products = db.prepare(`
    SELECT p.id, p.name, p.contact_email, p.cc_email,
      p.recording_date, p.broadcast_date, p.category_id
    FROM products p
    WHERE p.contact_email IS NOT NULL AND p.contact_email != ''
      AND (p.recording_date = ? OR p.broadcast_date = ?)
  `).all(d5date, d5date) as Array<{ id: string; name: string; contact_email: string; cc_email: string; recording_date: string; broadcast_date: string; category_id: string; }>;

  const results: Array<{ product: string; status: string; reason?: string }> = [];

  for (const product of products) {
    const toList = parseEmails(product.contact_email);
    if (toList.length === 0) continue;

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
    if (pct >= 100) { results.push({ product: product.name, status: 'skipped', reason: '100%' }); continue; }

    const dateLines: string[] = [];
    if (product.recording_date === d5date) dateLines.push('녹화일');
    if (product.broadcast_date === d5date) dateLines.push('송출일');
    const result = await sendRemindEmail(product, dateLines.join(' / '));
    results.push({ product: product.name, status: result.error ? 'error' : 'sent', reason: result.error || `to: ${(result as {to: string[]}).to?.join(', ')}` });
  }

  return NextResponse.json({ d5date, checked: products.length, results });
}
