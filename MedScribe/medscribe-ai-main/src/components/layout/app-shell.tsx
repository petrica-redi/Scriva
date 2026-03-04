'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { OfflineIndicator } from '@/components/features/OfflineIndicator';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="min-h-screen text-medical-text">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      <main className="relative pt-20 lg:ml-72">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-10 h-60 w-60 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-56 w-56 rounded-full bg-amber-100/40 blur-3xl" />
        </div>
        <div className="relative min-h-[calc(100vh-5rem)] animate-slide-in px-3 pb-8 sm:px-6">
          {children}
        </div>
      </main>

      <OfflineIndicator />
    </div>
  );
}
