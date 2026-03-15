'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BrainCircuit,
  Calendar,
  ChartNoAxesCombined,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ScrivaLogo } from '@/components/ui/ScrivaLogo';
import type { TranslationKey } from '@/lib/i18n/translations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

interface NavGroup {
  label: string;
  items: { labelKey: TranslationKey; href: string; icon: typeof LayoutDashboard }[];
}

export function Sidebar({ isOpen, onClose, userEmail, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const navGroups: NavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { labelKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
        { labelKey: 'nav.patients', href: '/patients', icon: Users },
        { labelKey: 'nav.calendar', href: '/calendar', icon: Calendar },
        { labelKey: 'nav.followUps' as TranslationKey, href: '/follow-ups', icon: ClipboardList },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { labelKey: 'nav.aiAssistant', href: '/ai-assistant', icon: BrainCircuit },
        { labelKey: 'nav.analytics', href: '/analytics', icon: ChartNoAxesCombined },
        { labelKey: 'nav.templates', href: '/templates', icon: FileText },
      ],
    },
    {
      label: 'Account',
      items: [
        { labelKey: 'nav.settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/consultation/new') return pathname.startsWith('/consultation');
    return pathname.startsWith(href);
  };

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? 'D';
  const userDisplayName = userEmail?.split('@')[0] ?? 'Doctor';

  const handleNewConsultation = () => {
    onClose();
    router.push('/consultation/new');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col transition-transform duration-300 lg:z-auto lg:translate-x-0',
          'bg-[#0d1b2a]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="group flex items-center gap-3 px-5 pt-6 pb-5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-500/30 transition group-hover:bg-teal-500/25">
            <ScrivaLogo size={22} />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-tight text-white">Scriva</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-400/70">Clinical AI</p>
          </div>
        </Link>

        {/* Start Consultation CTA */}
        <div className="px-3 pb-4">
          <button
            onClick={handleNewConsultation}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-3 text-left shadow-lg shadow-teal-500/25 transition-all duration-200 hover:shadow-teal-500/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-white/0 transition group-hover:bg-white/5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">New Consultation</p>
                  <p className="text-[10px] text-teal-100/80">In-person or remote</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/60 transition group-hover:translate-x-0.5 group-hover:text-white/90" />
            </div>
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-1 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-teal-500/15 text-teal-300'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                          active ? 'text-teal-400' : 'text-white/35'
                        )}
                      />
                      <span>{t(item.labelKey)}</span>
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: user + language + signout */}
        <div className="border-t border-white/8 px-3 pb-5 pt-4 space-y-2">
          <LanguageSwitcher dark />

          {/* User row */}
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-300 ring-1 ring-teal-500/30">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white/80">{userDisplayName}</p>
              <p className="truncate text-[10px] text-white/35">{userEmail}</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/4 px-3 py-2 text-[13px] font-medium text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>

          {/* Legal */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-white/20">
            <Link href="/privacy" className="transition hover:text-white/40">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="transition hover:text-white/40">Terms</Link>
          </div>
        </div>
      </aside>
    </>
  );
}
