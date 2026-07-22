import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { execSync } from 'child_process';

function findChromium(): string {
  const candidates = ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome'];
  for (const bin of candidates) {
    try { return execSync(`which ${bin}`).toString().trim(); } catch {}
  }
  throw new Error('Chromium not found. Install via nixpacks or set CHROMIUM_PATH env var.');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT product_id FROM share_tokens WHERE token = ?').get(token) as { product_id: string } | undefined;
  if (!shareRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const port = process.env.PORT || '3000';
  const url = `http://localhost:${port}/share/${token}?t=${Date.now()}`;

  try {
    const { chromium } = await import('playwright-core');
    const executablePath = process.env.CHROMIUM_PATH || findChromium();
    const browser = await chromium.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle' });

    const el = await page.$('#qa-capture-area');
    if (!el) { await browser.close(); return NextResponse.json({ error: 'Element not found' }, { status: 500 }); }

    const buf = await el.screenshot({ type: 'png' });
    await browser.close();

    return new NextResponse(buf as unknown as BodyInit, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('screenshot error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
