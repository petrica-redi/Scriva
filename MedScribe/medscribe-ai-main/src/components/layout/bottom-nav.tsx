'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Plus,
  Calendar,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/patients', icon: Users, label: 'Patients' },
  { href: '/consultation/new', icon: Plus, label: 'New', isAction: true },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/consultation/new') return pathname.startsWith('/consultation');
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map(({ href, icon: Icon, label, isAction }) =>
          isAction ? (
            <button
              key={href}
              onClick={() => router.push(href)}
              className="flex flex-col items-center justify-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/30 transition active:scale-95">
                <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-w-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-colors active:scale-95',
                isActive(href) ? 'text-teal-600' : 'text-slate-400'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform', isActive(href) ? 'text-teal-600' : 'text-slate-400')} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className={cn('text-[10px] font-medium', isActive(href) ? 'text-teal-600' : 'text-slate-400')}>
                {label}
              </span>
              {isActive(href) && (
                <span className="absolute -top-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-teal-500" />
              )}
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
