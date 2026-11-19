import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });

  const { id } = await params;
  const db = getDb();

  const product = db.prepare(`
    SELECT p.name, p.partner_name, p.recording_date, p.broadcast_date
    FROM products p WHERE p.id = ?
  `).get(id) as { name: string; partner_name: string; recording_date: string; broadcast_date: string } | undefined;

  if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });

  const records = db.prepare(`
    SELECT t.item_name, t.standard,
      COALESCE(r.status, '미완료') as status,
      r.qa_notes, r.standard_notes, r.due_date,
      COALESCE(r.priority, 0) as priority
    FROM qa_templates t
    LEFT JOIN qa_records r ON r.template_id = t.id AND r.product_id = ?
    WHERE t.category_id = (SELECT category_id FROM products WHERE id = ?)
    ORDER BY COALESCE(r.priority, 0) DESC, t.sort_order
  `).all(id, id) as Array<{
    item_name: string; standard: string; status: string;
    qa_notes: string; standard_notes: string; due_date: string; priority: number;
  }>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function dday(dateStr: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  const recordLines = records.map((r, i) => {
    const parts = [
      `${i + 1}. [${r.status}]${r.priority ? ' ⚡최우선' : ''} ${r.item_name}`,
    ];
    if (r.due_date) {
      const dd = dday(r.due_date);
      const ddLabel = dd === 0 ? 'D-Day' : dd !== null && dd > 0 ? `D-${dd}` : dd !== null ? `D+${Math.abs(dd)} 초과` : '';
      parts.push(`   완료예정일: ${r.due_date} (${ddLabel})`);
    }
    if (r.qa_notes) parts.push(`   QA확인사항: ${r.qa_notes}`);
    if (r.standard_notes) parts.push(`   QA의견: ${r.standard_notes}`);
    return parts.join('\n');
  }).join('\n');

  const done  = records.filter(r => r.status === '완료').length;
  const na    = records.filter(r => r.status === '해당없음').length;
  const todo  = records.filter(r => r.status === '미완료').length;
  const prog  = records.filter(r => r.status === '진행중').length;
  const hold  = records.filter(r => r.status === '보류').length;
  const prio  = records.filter(r => r.priority).length;
  const eff   = records.length - na;
  const pct   = eff > 0 ? Math.round((done / eff) * 100) : 0;

  const recDday = product.recording_date ? dday(product.recording_date) : null;
  const brdDday = product.broadcast_date ? dday(product.broadcast_date) : null;

  const prompt = `당신은 QA(품질검사) 체크리스트를 분석하는 전문가입니다.
아래 QA 현황 데이터를 바탕으로 한국어로 간결하고 실용적인 요약을 작성해주세요.

## 상품 정보
- 상품명: ${product.name}
- 협력사: ${product.partner_name || '미입력'}
- 녹화일: ${product.recording_date || '미입력'}${recDday !== null ? ` (${recDday === 0 ? 'D-Day' : recDday > 0 ? `D-${recDday}` : `D+${Math.abs(recDday)} 초과`})` : ''}
- 송출일: ${product.broadcast_date || '미입력'}${brdDday !== null ? ` (${brdDday === 0 ? 'D-Day' : brdDday > 0 ? `D-${brdDday}` : `D+${Math.abs(brdDday)} 초과`})` : ''}

## QA 진행 현황
- 전체: ${records.length}항목 / 완료: ${done} / 미완료: ${todo} / 진행중: ${prog} / 보류: ${hold} / 해당없음: ${na}
- 완료율: ${pct}%
- 최우선 처리 항목: ${prio}건

## 항목별 상세
${recordLines}

## 요약 작성 가이드
1. 첫 줄: 완료율과 전반적인 진행 상황을 한 문장으로
2. 최우선 항목이 있으면 반드시 명시
3. 완료예정일이 초과된 항목 강조
4. QA 의견이나 확인사항에서 주요 이슈 추출
5. 마지막에 가장 시급한 액션 아이템 1~3개 제시
6. 전체 200자 이내로 간결하게 (불필요한 소제목/마크다운 형식 없이 자연스러운 문장으로)`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.4 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: `Gemini API 오류: ${JSON.stringify(err)}` }, { status: 500 });
    }

    const data = await res.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text || '요약을 생성할 수 없습니다.';
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
