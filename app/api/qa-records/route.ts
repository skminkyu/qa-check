import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { productId, templateId, status, qaNotes, standardNotes } = await req.json();
  if (!productId || !templateId) return NextResponse.json({ error: '필수값 누락' }, { status: 400 });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM qa_records WHERE product_id = ? AND template_id = ?').get(productId, templateId);
  if (existing) {
    db.prepare(`
      UPDATE qa_records SET status=?, qa_notes=?, standard_notes=?, updated_at=datetime('now')
      WHERE product_id=? AND template_id=?
    `).run(status, qaNotes, standardNotes, productId, templateId);
  } else {
    db.prepare(`
      INSERT INTO qa_records (id, product_id, template_id, status, qa_notes, standard_notes)
      VALUES (?,?,?,?,?,?)
    `).run(uuidv4(), productId, templateId, status, qaNotes, standardNotes);
  }
  return NextResponse.json({ ok: true });
}
