import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT product_id FROM share_tokens WHERE token = ?').get(token) as { product_id: string } | undefined;
  if (!shareRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const baseUrl = req.nextUrl.origin;
  const url = `${baseUrl}/share/${token}`;

  try {
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
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

    return new NextResponse(buf, {
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
