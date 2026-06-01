import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { itemName, sortOrder } = await req.json();
  const db = getDb();
  if (itemName !== undefined) db.prepare('UPDATE qa_templates SET item_name = ? WHERE id = ?').run(itemName, id);
  if (sortOrder !== undefined) db.prepare('UPDATE qa_templates SET sort_order = ? WHERE id = ?').run(sortOrder, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  getDb().prepare('DELETE FROM qa_templates WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
