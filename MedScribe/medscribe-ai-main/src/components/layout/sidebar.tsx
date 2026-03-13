'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BrainCircuit,
  Calendar,
  ChartNoAxesCombined,
  ClipboardList,
  ClipboardPlus,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import type { TranslationKey } from '@/lib/i18n/translations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

export function Sidebar({ isOpen, onClose, userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems: { labelKey: TranslationKey; href: string; icon: typeof LayoutDashboard }[] = [
    { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
    { labelKey: 'nav.newConsultation', href: '/consultation/new', icon: ClipboardPlus },
    { labelKey: 'nav.aiAssistant', href: '/ai-assistant', icon: BrainCircuit },
    { labelKey: 'nav.patients', href: '/patients', icon: Users },
    { labelKey: 'nav.analytics', href: '/analytics', icon: ChartNoAxesCombined },
    { labelKey: 'nav.calendar', href: '/calendar', icon: Calendar },
    { labelKey: 'nav.templates', href: '/templates', icon: FileText },
    { labelKey: 'nav.portal' as TranslationKey, href: '/portal', icon: MessageSquare },
    { labelKey: 'nav.followUps' as TranslationKey, href: '/follow-ups', icon: ClipboardList },
    { labelKey: 'nav.admin' as TranslationKey, href: '/admin', icon: Database },
    { labelKey: 'nav.settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/consultation/new') return pathname.startsWith('/consultation');
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px] lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/70 bg-[#f6f8fa]/95 px-5 pb-5 pt-6 shadow-ambient backdrop-blur-xl transition-transform duration-300 lg:z-auto lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Link href="/dashboard" className="group mb-7 flex items-center gap-3" onClick={onClose}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 text-white shadow-lg shadow-brand-900/25 transition group-hover:scale-105">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl leading-none text-medical-text">MedScribe</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-brand-700">{t('sidebar.aiDocumentation')}</p>
          </div>
        </Link>

        <div className="mb-4 rounded-2xl border border-brand-100 bg-white/75 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-medical-muted">{t('sidebar.sessionReadiness')}</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-medical-text">{t('sidebar.systemHealth')}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{t('sidebar.operational')}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-brand-100 to-white text-brand-800 shadow-sm ring-1 ring-brand-200'
                    : 'text-medical-muted hover:bg-white hover:text-medical-text'
                )}
              >
                <Icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', active ? 'text-brand-700' : 'text-medical-muted')} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/70 bg-white/80 p-3">
          <LanguageSwitcher />
          {userEmail && (
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-medical-muted">{t('sidebar.signedInAs')}</p>
              <p className="mt-1 truncate text-sm font-semibold text-medical-text">{userEmail}</p>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{t('sidebar.signOut')}</span>
          </button>
          <div className="flex items-center justify-center gap-3 text-[11px] text-medical-muted">
            <Link href="/privacy" className="hover:text-medical-text transition">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-medical-text transition">Terms</Link>
          </div>
        </div>
      </aside>
    </>
  );
}
