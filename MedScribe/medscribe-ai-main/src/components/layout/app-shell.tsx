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

      <main className="relative pt-14 lg:ml-64">
        <div className="min-h-[calc(100vh-3.5rem)] animate-slide-in px-3 pb-8 sm:px-6">
          {children}
        </div>
      </main>

      <OfflineIndicator />
    </div>
  );
}
