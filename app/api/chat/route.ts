import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/chat?productId=xxx 또는 ?groupId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  const groupId = searchParams.get('groupId');
  if (!productId && !groupId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const db = getDb();
  const messages = productId
    ? db.prepare('SELECT * FROM chat_messages WHERE product_id = ? ORDER BY created_at ASC').all(productId)
    : db.prepare('SELECT * FROM chat_messages WHERE group_id = ? ORDER BY created_at ASC').all(groupId);

  return NextResponse.json({ messages });
}

// POST /api/chat — 메시지 전송
export async function POST(req: NextRequest) {
  const { productId, groupId, senderName, message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'empty message' }, { status: 400 });
  if (!productId && !groupId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const session = await getSession();
  const isAdmin = !!session;
  const name = isAdmin ? (session.name || '관리자') : (senderName?.trim() || '외부 사용자');

  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO chat_messages (id, product_id, group_id, sender_name, is_admin, message, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, productId ?? null, groupId ?? null, name, isAdmin ? 1 : 0, message.trim(), isAdmin ? 1 : 0);

  return NextResponse.json({ ok: true, id });
}

// PATCH /api/chat — 메시지 읽음 처리 (관리자)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { productId, groupId } = await req.json();
  const db = getDb();

  if (productId) {
    db.prepare('UPDATE chat_messages SET is_read = 1 WHERE product_id = ? AND is_admin = 0').run(productId);
  } else if (groupId) {
    db.prepare('UPDATE chat_messages SET is_read = 1 WHERE group_id = ? AND is_admin = 0').run(groupId);
  }

  return NextResponse.json({ ok: true });
}
