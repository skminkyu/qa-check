import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const schedules = db.prepare(
    'SELECT date, am_blocked, pm_blocked FROM mfr_eval_schedules WHERE product_id = ? ORDER BY date'
  ).all(id);
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { date, amBlocked, pmBlocked } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const db = getDb();

  if (!amBlocked && !pmBlocked) {
    db.prepare('DELETE FROM mfr_eval_schedules WHERE product_id = ? AND date = ?').run(id, date);
  } else {
    const existing = db.prepare('SELECT id FROM mfr_eval_schedules WHERE product_id = ? AND date = ?').get(id, date) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE mfr_eval_schedules SET am_blocked = ?, pm_blocked = ? WHERE product_id = ? AND date = ?')
        .run(amBlocked ? 1 : 0, pmBlocked ? 1 : 0, id, date);
    } else {
      db.prepare('INSERT INTO mfr_eval_schedules (id, product_id, date, am_blocked, pm_blocked) VALUES (?,?,?,?,?)')
        .run(uuidv4(), id, date, amBlocked ? 1 : 0, pmBlocked ? 1 : 0);
    }
  }

  return NextResponse.json({ ok: true });
}
