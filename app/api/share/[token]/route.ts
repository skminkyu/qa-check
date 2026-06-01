import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const shareRow = db.prepare('SELECT product_id FROM share_tokens WHERE token = ?').get(token) as { product_id: string } | undefined;
  if (!shareRow) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });

  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(shareRow.product_id);

  const records = db.prepare(`
    SELECT r.*, t.item_name, t.sort_order
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY t.sort_order
  `).all(shareRow.product_id, shareRow.product_id);

  return NextResponse.json({ product, records });
}
