import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Container, Section, Card, Badge } from '@/components/ui';
import { signOut } from '@/actions/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Operator console' };

// Middleware already keeps customers out; this is defense-in-depth server-side.
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  const { data } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  if ((data as { role?: string } | null)?.role !== 'admin') redirect('/dashboard');
  return user;
}

const PANELS = [
  { title: 'Pipeline', body: 'Prospects, inbound website requests, and outreach — coming with the operator console.' },
  { title: 'Customers', body: 'Every business and its subscribed services, across the platform.' },
  { title: 'Services', body: 'SiteVitals, and future CallBack / Reviews / Social service ops.' },
];

export default async function AdminPage() {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh bg-paper-50">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex items-center justify-between py-4">
          <Logo href="/admin" />
          <form action={signOut}>
            <button className="btn-ghost px-3 py-1.5 text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <Section tone="paper">
        <Container>
          <Badge tone="brick">Operator console</Badge>
          <h1 className="mt-3 text-3xl font-bold text-green-900">Welcome back.</h1>
          <p className="mt-2 text-charcoal-700">
            Signed in as {user.email}. The full console (pipeline, customers, services) is built in a
            later session — this is the admin landing.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {PANELS.map((p) => (
              <Card key={p.title} className="p-6">
                <h2 className="text-lg font-bold text-green-900">{p.title}</h2>
                <p className="mt-1 text-sm text-charcoal-700">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </div>
  );
}
