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

  // 화장품 카테고리면 상품확인정보 기본값 생성
  const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId) as { name: string } | undefined;
  let defaultNotes = '';
  if (category?.name === '화장품') {
    const lines = [
      `■ ${name}`,
      '1. 화장품제조원/책임판매원 : ',
      '2. 용량 : ',
      '3. 사용기한 및 제조년월 : 제조일로부터 (  )개월 (제조년월 : )',
      '4. 용법용량 : ',
      '5. 효능효과 : ',
      '6. 전성분 : ',
      '7. 기능/특징',
      '- ',
      '8. 사용상 주의사항 : ',
      '1) 화장품 사용 시 또는 사용 후 직사광선에 의하여 사용부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우에는 전문의 등과 상담할 것',
      '2) 상처가 있는 부위 등에는 사용을 자제할 것',
      '3) 보관 및 취급시의 주의사항',
      '가. 어린이의 손이 닿지 않는 곳에 보관할 것',
      '나. 직사광선을 피해서 보관할 것',
    ];
    defaultNotes = lines.map(l => `<p>${l}</p>`).join('');
  }

  db.prepare('INSERT INTO products (id, category_id, name, partner_name, md_name, product_notes) VALUES (?,?,?,?,?,?)').run(
    id, categoryId, name, partnerName || null, mdName || null, defaultNotes || null
  );

  // Auto-create QA records for all templates in this category
  const templates = db.prepare('SELECT id FROM qa_templates WHERE category_id = ?').all(categoryId) as { id: string }[];
  const ins = db.prepare('INSERT OR IGNORE INTO qa_records (id, product_id, template_id) VALUES (?,?,?)');
  for (const t of templates) ins.run(uuidv4(), id, t.id);

  return NextResponse.json({ id, name, categoryId, partnerName, mdName });
}
