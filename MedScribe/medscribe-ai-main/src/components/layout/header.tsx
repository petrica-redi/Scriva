'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search, Sparkles } from 'lucide-react';
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
      } catch {
        // silently fail
      }
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

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur-xl lg:left-72 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-1.5 text-xs font-semibold text-brand-700 sm:flex">
            <Sparkles className="h-4 w-4" />
            {t('header.precisionWorkspace')}
          </div>
        </div>

        <div ref={searchRef} className="relative hidden max-w-xl flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-medical-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setShowResults(true)}
            placeholder={t('header.searchPlaceholder')}
            className="w-full rounded-xl border border-white/70 bg-white px-10 py-2.5 text-sm text-medical-text shadow-sm outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200/40"
          />

          {showResults && searchResults && totalResults > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
              {searchResults.consultations.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-medical-muted">{t('header.consultations')}</p>
                  {searchResults.consultations.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        router.push(`/consultation/${r.id}/note`);
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-medical-text">{r.patient_name}</span>
                      <span className="text-xs text-medical-muted">{r.visit_type}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.patients.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-medical-muted">{t('header.patients')}</p>
                  {searchResults.patients.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        router.push('/patients');
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-medical-text">{r.full_name}</span>
                      <span className="text-xs text-medical-muted">{r.mrn || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.notes.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-medical-muted">{t('header.transcriptMatches')}</p>
                  {searchResults.notes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        router.push(`/consultation/${r.id}/note`);
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                    >
                      <span className="font-semibold text-medical-text">{r.patient_name}</span>
                      <span className="text-xs text-medical-muted">transcript</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {showResults && searchResults && totalResults === 0 && searchQuery.length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-medical-muted shadow-lift">
              {t('header.noResults')} &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lift">
                <p className="text-sm font-semibold text-medical-text">{t('header.notifications')}</p>
                <p className="mt-2 text-sm text-medical-muted">{t('header.noNotifications')}</p>
              </div>
            )}
          </div>

          {userEmail && (
            <div className="hidden items-center gap-3 rounded-xl border border-white/70 bg-white px-3 py-1.5 shadow-sm sm:flex">
              <div className="text-right">
                <p className="text-xs text-medical-muted">{t('header.signedIn')}</p>
                <p className="text-sm font-semibold text-medical-text">{userEmail}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-sm font-bold text-white">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <LanguageSwitcher compact />

          <button
            onClick={onSignOut}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('header.signOut')}
          </button>
        </div>
      </div>
    </header>
  );
}
