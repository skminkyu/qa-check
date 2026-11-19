import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY가 설정되지 않았습니다.' }, { status: 500 });

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

  // Only include actionable records (non-완료, non-해당없음) to keep prompt small
  const actionable = records.filter(r => r.status !== '완료' && r.status !== '해당없음');
  const truncate = (s: string, n: number) => s && s.length > n ? s.slice(0, n) + '…' : s;
  const recordLines = actionable.slice(0, 30).map((r, i) => {
    const dd = r.due_date ? dday(r.due_date) : null;
    const ddLabel = dd === null ? '' : dd === 0 ? ' D-Day' : dd > 0 ? ` D-${dd}` : ` D+${Math.abs(dd)}초과`;
    const notes = [r.qa_notes && `확인:${truncate(r.qa_notes, 60)}`, r.standard_notes && `의견:${truncate(r.standard_notes, 60)}`].filter(Boolean).join(' / ');
    return `${i + 1}.[${r.status}]${r.priority ? '⚡' : ''} ${r.item_name}${r.due_date ? `(${r.due_date}${ddLabel})` : ''}${notes ? ` - ${notes}` : ''}`;
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

  const recDate = product.recording_date ? `${product.recording_date}${recDday !== null ? `(${recDday === 0 ? 'D-Day' : recDday > 0 ? `D-${recDday}` : `D+${Math.abs(recDday)}초과`})` : ''}` : '미입력';
  const brdDate = product.broadcast_date ? `${product.broadcast_date}${brdDday !== null ? `(${brdDday === 0 ? 'D-Day' : brdDday > 0 ? `D-${brdDday}` : `D+${Math.abs(brdDday)}초과`})` : ''}` : '미입력';

  const prompt = `QA 체크리스트 요약 (한국어, 200자 이내, 소제목 없이 자연스러운 문장):

상품: ${product.name} / 협력사: ${product.partner_name || '-'} / 녹화: ${recDate} / 송출: ${brdDate}
완료율: ${pct}% (전체${records.length} 완료${done} 미완료${todo} 진행중${prog} 보류${hold} 해당없음${na}) 최우선${prio}건

미완료/진행중/보류 항목(${actionable.length}건):
${recordLines}

요약 시 완료율·최우선항목·기한초과·주요이슈·시급한 액션1~3개 포함.`;

  const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

  let lastError = '';
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.4,
          }),
        });
        if (res.status === 503) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        if (res.status === 429) {
          // rate limit - try next model immediately
          const err = await res.json().catch(() => ({}));
          lastError = `[${model}] ${JSON.stringify(err)}`;
          break;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastError = `[${model}] ${JSON.stringify(err)}`;
          break; // try next model on any error
        }
        const data = await res.json();
        const summary = data?.choices?.[0]?.message?.content?.trim();
        if (!summary) {
          lastError = `[${model}] empty response`;
          break; // try next model if empty
        }
        return NextResponse.json({ summary, model });
      } catch (e) {
        lastError = String(e);
        break;
      }
    }
  }

  return NextResponse.json({ error: `Groq API 오류: ${lastError || '모든 모델 실패'}` }, { status: 500 });
}
