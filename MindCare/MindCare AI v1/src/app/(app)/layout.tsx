import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Providers } from '@/components/providers';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';

export const metadata = {
  title: 'MindCare AI',
  description: 'Medical transcription and documentation AI',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail = "demo@mindcare.local";
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) userEmail = user.email;
  } catch {}

  return (
    <Providers>
      <ToastProvider>
        <AppShell userEmail={userEmail}>
          {children}
        </AppShell>
      </ToastProvider>
    </Providers>
  );
}
