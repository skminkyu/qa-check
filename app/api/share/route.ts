import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { productId } = await req.json();
  const db = getDb();

  // Reuse existing token if exists
  const existing = db.prepare('SELECT token FROM share_tokens WHERE product_id = ?').get(productId) as { token: string } | undefined;
  if (existing) return NextResponse.json({ token: existing.token });

  const token = uuidv4().replace(/-/g, '');
  db.prepare('INSERT INTO share_tokens (id, product_id, token) VALUES (?,?,?)').run(uuidv4(), productId, token);
  return NextResponse.json({ token });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { productId } = await req.json();
  getDb().prepare('DELETE FROM share_tokens WHERE product_id = ?').run(productId);
  return NextResponse.json({ ok: true });
}
