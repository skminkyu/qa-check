import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { role, password } = await req.json();
  const db = getDb();
  if (role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (id === session.userId) return NextResponse.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 });
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
