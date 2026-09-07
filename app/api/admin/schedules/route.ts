import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const schedules = db.prepare(
    'SELECT date, am_blocked, pm_blocked FROM admin_schedules ORDER BY date'
  ).all();
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { date, amBlocked, pmBlocked } = await req.json();
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

  const db = getDb();

  if (!amBlocked && !pmBlocked) {
    db.prepare('DELETE FROM admin_schedules WHERE date = ?').run(date);
  } else {
    const existing = db.prepare('SELECT id FROM admin_schedules WHERE date = ?').get(date) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE admin_schedules SET am_blocked = ?, pm_blocked = ? WHERE date = ?')
        .run(amBlocked ? 1 : 0, pmBlocked ? 1 : 0, date);
    } else {
      db.prepare('INSERT INTO admin_schedules (id, date, am_blocked, pm_blocked) VALUES (?,?,?,?)')
        .run(uuidv4(), date, amBlocked ? 1 : 0, pmBlocked ? 1 : 0);
    }
  }

  return NextResponse.json({ ok: true });
}
