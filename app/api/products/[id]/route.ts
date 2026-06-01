import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const records = db.prepare(`
    SELECT r.*, t.item_name, t.sort_order
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(id, id);

  return NextResponse.json({ product, records });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { name, partnerName, mdName, productNotes } = await req.json();
  const db = getDb();
  if (productNotes !== undefined) {
    db.prepare('UPDATE products SET product_notes=?, updated_at=datetime(\'now\') WHERE id=?').run(productNotes, id);
  }
  if (name !== undefined) {
    db.prepare('UPDATE products SET name=?, partner_name=?, md_name=?, updated_at=datetime(\'now\') WHERE id=?').run(name, partnerName, mdName, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
