'use client';
import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_name: string;
  is_admin: number;
  message: string;
  created_at: string;
}

interface Props {
  productId?: string;
  groupId?: string;
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
      const unreadCount = data.messages.filter((m: Message) => !m.is_admin && !open).length;
      if (!open) setUnread(data.messages.filter((m: Message) => m.is_admin === 0).length);
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
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, groupId, senderName: '관리자', message: input.trim() }),
    });
    setInput('');
    await fetchMessages();
    setSending(false);
  }

  const externalCount = messages.filter(m => m.is_admin === 0).length;

  return (
    <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">💬 외부 문의</span>
          {externalCount > 0 && (
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
              {externalCount}건
            </span>
          )}
          {unread > 0 && !open && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
              NEW {unread}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲ 접기' : '▼ 펼치기'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* 메시지 목록 */}
          <div className="h-72 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-8">아직 문의가 없습니다.</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.is_admin ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                  {!m.is_admin && <div className="text-xs font-semibold text-slate-500 mb-0.5">{m.sender_name}</div>}
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <p className={`text-xs mt-1 ${m.is_admin ? 'text-violet-200' : 'text-slate-400'}`}>
                    {new Date(m.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-4 py-3 border-t border-slate-100 flex gap-2 bg-white">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="답변 입력..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-violet-700 transition disabled:opacity-40"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
