'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface SearchResult {
  id: string;
  visit_type?: string;
  patient_name?: string;
  full_name?: string;
  status?: string;
  mrn?: string;
}

interface HeaderProps {
  onMenuClick: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

export function Header({ onMenuClick, userEmail, onSignOut }: HeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    consultations: SearchResult[];
    notes: SearchResult[];
    patients: SearchResult[];
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        }
      } catch { /* silently fail */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalResults =
    (searchResults?.consultations?.length || 0) +
    (searchResults?.notes?.length || 0) +
    (searchResults?.patients?.length || 0);

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? 'D';

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl lg:left-64">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">

        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1 max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setShowResults(true)}
            placeholder={t('header.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-700 placeholder-slate-400 transition focus:border-teal-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200/60"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {showResults && searchResults && totalResults > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/60">
              {searchResults.consultations.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {t('header.consultations')}
                  </p>
                  {searchResults.consultations.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { router.push(`/consultation/${r.id}/note`); setShowResults(false); setSearchQuery(''); }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-800">{r.patient_name}</span>
                      <span className="text-xs text-slate-400">{r.visit_type}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.patients.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {t('header.patients')}
                  </p>
                  {searchResults.patients.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { router.push('/patients'); setShowResults(false); setSearchQuery(''); }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-800">{r.full_name}</span>
                      <span className="text-xs text-slate-400">{r.mrn || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.notes.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {t('header.transcriptMatches')}
                  </p>
                  {searchResults.notes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { router.push(`/consultation/${r.id}/note`); setShowResults(false); setSearchQuery(''); }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-800">{r.patient_name}</span>
                      <span className="text-xs text-slate-400">transcript</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {showResults && searchResults && totalResults === 0 && searchQuery.length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400 shadow-xl">
              {t('header.noResults')} &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher compact />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="text-sm font-semibold text-slate-800">{t('header.notifications')}</p>
                <p className="mt-2 text-sm text-slate-400">{t('header.noNotifications')}</p>
              </div>
            )}
          </div>

          {/* User avatar */}
          {userEmail && (
            <div className="group relative ml-1">
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow-sm ring-2 ring-white transition hover:ring-teal-200">
                {userInitial}
              </button>
              {/* Hover popover */}
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                <p className="text-xs text-slate-400">{t('header.signedIn')}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{userEmail}</p>
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <button
                    onClick={onSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  >
                    {t('header.signOut')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
