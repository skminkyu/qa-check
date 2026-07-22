import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { chromium } from 'playwright';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT token FROM share_tokens WHERE product_id = ?').get(id) as { token: string } | undefined;

  let url: string;
  const baseUrl = req.nextUrl.origin;

  if (shareRow) {
    url = `${baseUrl}/share/${shareRow.token}`;
  } else {
    return NextResponse.json({ error: 'No share token — generate a share link first' }, { status: 400 });
  }

  try {
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle' });

    const el = await page.$('#qa-capture-area');
    if (!el) {
      await browser.close();
      return NextResponse.json({ error: 'Element not found' }, { status: 500 });
    }

    const buf = await el.screenshot({ type: 'png' });
    await browser.close();

    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('screenshot error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
