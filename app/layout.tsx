import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QA 체크 시스템',
  description: '상품 QA 진척 현황 관리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
