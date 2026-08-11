import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM product_groups ORDER BY created_at').all();
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: '이름 필요' }, { status: 400 });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO product_groups (id, name) VALUES (?,?)').run(id, name.trim());
  return NextResponse.json({ id, name: name.trim() });
}
