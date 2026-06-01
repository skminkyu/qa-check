import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = getDb().prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at').all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name, password, role } = await req.json();
  if (!email || !name || !password) return NextResponse.json({ error: '필수값 누락' }, { status: 400 });

  const db = getDb();
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)').run(
      id, email, name, hash, role || 'editor'
    );
  } catch {
    return NextResponse.json({ error: '이미 존재하는 이메일입니다.' }, { status: 409 });
  }
  return NextResponse.json({ id, email, name, role: role || 'editor' });
}
