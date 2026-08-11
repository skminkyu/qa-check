import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { name } = await req.json();
  if (name !== undefined) getDb().prepare('UPDATE product_groups SET name=? WHERE id=?').run(name, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  db.prepare('UPDATE products SET group_id=NULL WHERE group_id=?').run(id);
  db.prepare('DELETE FROM product_groups WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
