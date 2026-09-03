import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/chat/unread — 관리자용 미읽음 카운트
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();

  const productUnread = db.prepare(`
    SELECT product_id as id, COUNT(*) as count
    FROM chat_messages
    WHERE is_admin = 0 AND is_read = 0 AND product_id IS NOT NULL
    GROUP BY product_id
  `).all() as Array<{ id: string; count: number }>;

  const groupUnread = db.prepare(`
    SELECT group_id as id, COUNT(*) as count
    FROM chat_messages
    WHERE is_admin = 0 AND is_read = 0 AND group_id IS NOT NULL
    GROUP BY group_id
  `).all() as Array<{ id: string; count: number }>;

  return NextResponse.json({ products: productUnread, groups: groupUnread });
}
