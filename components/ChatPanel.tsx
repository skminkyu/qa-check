'use client';
import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_name: string;
  is_admin: number;
  is_read: number;
  message: string;
  created_at: string;
}

interface Props {
  productId?: string;
  groupId?: string;
}

function formatKST(dateStr: string) {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ChatPanel({ productId, groupId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const param = productId ? `productId=${productId}` : `groupId=${groupId}`;

  async function fetchMessages() {
    const res = await fetch(`/api/chat?${param}`);
    const data = await res.json();
    if (data.messages) {
      setMessages(data.messages);
      const unreadCount = data.messages.filter((m: Message) => m.is_admin === 0 && m.is_read === 0).length;
      setUnread(unreadCount);
    }
  }

  async function markRead() {
    await fetch('/api/chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, groupId }),
    });
    setUnread(0);
  }

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (open) {
      markRead();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, groupId, senderName: '관리자', message: input.trim(), source: 'admin' }),
    });
    setInput('');
    await fetchMessages();
    setSending(false);
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-violet-700 transition"
        title="외부 문의 확인"
      >
        💬
      </button>

      {/* 채팅창 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ height: '420px' }}>
          {/* 헤더 */}
          <div className="bg-violet-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">외부 문의</span>
              {messages.filter(m => m.is_admin === 0).length > 0 && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {messages.filter(m => m.is_admin === 0).length}건
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-violet-200 hover:text-white text-lg">✕</button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-8">아직 문의가 없습니다.</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.is_admin ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                  {!m.is_admin && <div className="text-xs font-semibold text-slate-500 mb-0.5">{m.sender_name}</div>}
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <p className={`text-xs mt-1 ${m.is_admin ? 'text-violet-200' : 'text-slate-400'}`}>
                    {formatKST(m.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 py-2 border-t border-slate-100 flex gap-2 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="답변 입력..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-violet-700 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </>
  );
}
