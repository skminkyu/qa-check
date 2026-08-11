import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const db = getDb();

    // Ensure share_token column exists
    try { db.exec('ALTER TABLE product_groups ADD COLUMN share_token TEXT'); } catch {}
    try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_pg_share_token ON product_groups(share_token) WHERE share_token IS NOT NULL'); } catch {}

    const row = db.prepare('SELECT share_token FROM product_groups WHERE id = ?').get(id) as { share_token: string | null } | undefined;
    if (!row) return NextResponse.json({ error: 'Not found', id }, { status: 404 });
    if (row.share_token) return NextResponse.json({ token: row.share_token });
    const token = uuidv4().replace(/-/g, '');
    db.prepare('UPDATE product_groups SET share_token = ? WHERE id = ?').run(token, id);
    return NextResponse.json({ token });
  } catch (e) {
    console.error('[group-share POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  getDb().prepare('UPDATE product_groups SET share_token = NULL WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
