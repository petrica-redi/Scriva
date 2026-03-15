'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
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
      const response = await fetch('/api/auth/signout', { method: 'POST' });
      if (response.ok) router.push('/auth/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-medical-text">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userEmail={userEmail}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile sidebar drawer — slides in from left when hamburger tapped */}
      <div className="lg:hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userEmail={userEmail}
          onSignOut={handleSignOut}
        />
      </div>

      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      />

      {/* Main — offset for desktop sidebar, extra bottom padding on mobile for bottom nav */}
      <main className="relative pt-14 lg:ml-64">
        <div className="min-h-[calc(100vh-3.5rem)] animate-slide-in px-3 pb-24 sm:px-5 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation — only shows on mobile */}
      <BottomNav />

      <OfflineIndicator />
    </div>
  );
}
