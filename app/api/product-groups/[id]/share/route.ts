import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT share_token FROM product_groups WHERE id = ?').get(id) as { share_token: string | null } | undefined;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.share_token) return NextResponse.json({ token: row.share_token });
  const token = uuidv4().replace(/-/g, '');
  db.prepare('UPDATE product_groups SET share_token = ? WHERE id = ?').run(token, id);
  return NextResponse.json({ token });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  getDb().prepare('UPDATE product_groups SET share_token = NULL WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
