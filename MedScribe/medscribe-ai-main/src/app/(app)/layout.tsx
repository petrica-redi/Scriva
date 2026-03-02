import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Providers } from '@/components/providers';
import { ToastProvider } from '@/components/ui/toast';
import { AppShell } from '@/components/layout/app-shell';

export const metadata = {
  title: 'MedScribe AI',
  description: 'Medical transcription and documentation AI',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <Providers>
      <ToastProvider>
        <AppShell userEmail={user.email}>
          {children}
        </AppShell>
      </ToastProvider>
    </Providers>
  );
}
