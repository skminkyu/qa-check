import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get('company');
  if (!company) {
    return NextResponse.json(
      { error: 'company 파라미터가 필요합니다.' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.name AS productName, st.token
       FROM products p
       JOIN share_tokens st ON st.product_id = p.id
       WHERE p.partner_name = ?`
    )
    .all(company) as { productName: string; token: string }[];

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    req.nextUrl.origin;

  const result = rows.map(({ productName, token }) => ({
    shareUrl: `${origin}/share/${token}`,
    productName,
  }));

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
