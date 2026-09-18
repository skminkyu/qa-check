import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = db.prepare(
    'SELECT slot_index, image_data FROM product_label_images WHERE product_id = ? ORDER BY slot_index'
  ).all(id) as Array<{ slot_index: number; image_data: string }>;
  return NextResponse.json({ images: rows });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { slot, imageData } = await req.json();
  if (typeof slot !== 'number' || slot < 0 || slot > 7) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO product_label_images (product_id, slot_index, image_data, updated_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(id, slot, imageData);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const slot = new URL(req.url).searchParams.get('slot');
  const db = getDb();
  db.prepare('DELETE FROM product_label_images WHERE product_id = ? AND slot_index = ?').run(id, Number(slot));
  return NextResponse.json({ ok: true });
}
