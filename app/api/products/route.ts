import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, c.name as category_name,
      (SELECT COUNT(*) FROM qa_records r WHERE r.product_id = p.id AND r.status = '완료') as done_count,
      (SELECT COUNT(*) FROM qa_templates t WHERE t.category_id = p.category_id) as total_count
    FROM products p JOIN categories c ON c.id = p.category_id
    ORDER BY p.created_at DESC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, categoryId, partnerName, mdName } = await req.json();
  if (!name || !categoryId) return NextResponse.json({ error: '필수값 누락' }, { status: 400 });

  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO products (id, category_id, name, partner_name, md_name) VALUES (?,?,?,?,?)').run(
    id, categoryId, name, partnerName || null, mdName || null
  );

  // Auto-create QA records for all templates in this category
  const templates = db.prepare('SELECT id FROM qa_templates WHERE category_id = ?').all(categoryId) as { id: string }[];
  const ins = db.prepare('INSERT OR IGNORE INTO qa_records (id, product_id, template_id) VALUES (?,?,?)');
  for (const t of templates) ins.run(uuidv4(), id, t.id);

  return NextResponse.json({ id, name, categoryId, partnerName, mdName });
}
