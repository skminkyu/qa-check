import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { signToken, setCookieHeader, TokenPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: '입력값이 없습니다.' }, { status: 400 });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
    id: string; email: string; name: string; password_hash: string; role: string;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const payload: TokenPayload = { userId: user.id, email: user.email, name: user.name, role: user.role as TokenPayload['role'] };
  const token = await signToken(payload);

  return NextResponse.json({ user: payload }, {
    headers: { 'Set-Cookie': setCookieHeader(token) },
  });
}
