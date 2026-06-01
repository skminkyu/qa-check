import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import NavBar from '@/components/NavBar';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'viewer') redirect('/dashboard');

  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY created_at').all() as Array<{ id: string; name: string }>;
  const templates = db.prepare('SELECT * FROM qa_templates ORDER BY category_id, sort_order').all() as Array<{
    id: string; category_id: string; item_name: string; sort_order: number;
  }>;
  const users = session.role === 'admin'
    ? db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at').all() as Array<{ id: string; email: string; name: string; role: string; created_at: string }>
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={session} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">설정</h1>
        <SettingsClient
          initialCategories={categories}
          initialTemplates={templates}
          initialUsers={users}
          userRole={session.role}
        />
      </main>
    </div>
  );
}
