import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories ORDER BY created_at').all();
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: '카테고리명이 필요합니다.' }, { status: 400 });

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, name) VALUES (?,?)').run(id, name);
  return NextResponse.json({ id, name });
}
