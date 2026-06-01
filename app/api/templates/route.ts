import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get('categoryId');
  const db = getDb();
  const rows = categoryId
    ? db.prepare('SELECT * FROM qa_templates WHERE category_id = ? ORDER BY sort_order').all(categoryId)
    : db.prepare('SELECT * FROM qa_templates ORDER BY category_id, sort_order').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { categoryId, itemName, sortOrder } = await req.json();
  if (!categoryId || !itemName) return NextResponse.json({ error: '필수값 누락' }, { status: 400 });

  const db = getDb();
  const id = uuidv4();
  const order = sortOrder ?? (db.prepare('SELECT COUNT(*) as c FROM qa_templates WHERE category_id = ?').get(categoryId) as { c: number }).c;
  db.prepare('INSERT INTO qa_templates (id, category_id, item_name, sort_order) VALUES (?,?,?,?)').run(id, categoryId, itemName, order);
  return NextResponse.json({ id, categoryId, itemName, sortOrder: order });
}
