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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { setSearchResults(await res.json()); setShowResults(true); }
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) setTimeout(() => mobileInputRef.current?.focus(), 50);
  }, [mobileSearchOpen]);

  const totalResults =
    (searchResults?.consultations?.length || 0) +
    (searchResults?.notes?.length || 0) +
    (searchResults?.patients?.length || 0);

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? 'D';

  const handleResultClick = (href: string) => {
    router.push(href);
    setShowResults(false);
    setSearchQuery('');
    setMobileSearchOpen(false);
  };

  const ResultsList = () => (
    <>
      {searchResults && totalResults > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/60">
          {searchResults.consultations?.map((r) => (
            <button key={r.id} onClick={() => handleResultClick(`/consultation/${r.id}/note`)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50">
              <span className="font-semibold text-slate-800">{r.patient_name}</span>
              <span className="text-xs text-slate-400">{r.visit_type}</span>
            </button>
          ))}
          {searchResults.patients?.map((r) => (
            <button key={r.id} onClick={() => handleResultClick('/patients')}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50">
              <span className="font-semibold text-slate-800">{r.full_name}</span>
              <span className="text-xs text-slate-400">{r.mrn || 'Patient'}</span>
            </button>
          ))}
          {searchResults.notes?.map((r) => (
            <button key={r.id} onClick={() => handleResultClick(`/consultation/${r.id}/note`)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-slate-50">
              <span className="font-semibold text-slate-800">{r.patient_name}</span>
              <span className="text-xs text-slate-400">transcript</span>
            </button>
          ))}
        </div>
      )}
      {searchResults && totalResults === 0 && searchQuery.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-400 shadow-xl">
          No results for &ldquo;{searchQuery}&rdquo;
        </div>
      )}
    </>
  );

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl lg:left-64"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex h-14 items-center gap-3 px-4 sm:px-5">

          {/* Desktop sidebar menu toggle */}
          <button onClick={onMenuClick}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            aria-label="Toggle menu">
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile: app wordmark */}
          <span className="text-[15px] font-bold tracking-tight text-slate-800 lg:hidden">Scriva</span>

          {/* Desktop search bar */}
          <div ref={searchRef} className="relative hidden flex-1 max-w-lg lg:block">
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
              <button onClick={() => { setSearchQuery(''); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showResults && <ResultsList />}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">

            {/* Mobile search icon */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 lg:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <LanguageSwitcher compact />

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"
                aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-sm font-semibold text-slate-800">{t('header.notifications')}</p>
                  <p className="mt-2 text-sm text-slate-400">{t('header.noNotifications')}</p>
                </div>
              )}
            </div>

            {/* Avatar */}
            {userEmail && (
              <div className="group relative ml-1">
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow-sm ring-2 ring-white transition hover:ring-teal-200 active:scale-95">
                  {userInitial}
                </button>
                <div className="invisible absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                  <p className="text-xs text-slate-400">{t('header.signedIn')}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{userEmail}</p>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <button onClick={onSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600">
                      {t('header.signOut')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex h-14 items-center gap-3 border-b border-slate-200 px-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, consultations…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none"
              />
            </div>
            <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); setShowResults(false); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {searchQuery.length < 2 ? (
              <p className="text-center text-sm text-slate-400 mt-8">Type at least 2 characters to search</p>
            ) : totalResults > 0 && searchResults ? (
              <div className="space-y-1">
                {searchResults.consultations?.map((r) => (
                  <button key={r.id} onClick={() => handleResultClick(`/consultation/${r.id}/note`)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5 text-left transition hover:bg-teal-50 active:bg-teal-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.patient_name}</p>
                      <p className="text-xs text-slate-400">{r.visit_type} · Consultation</p>
                    </div>
                  </button>
                ))}
                {searchResults.patients?.map((r) => (
                  <button key={r.id} onClick={() => handleResultClick('/patients')}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5 text-left transition hover:bg-teal-50 active:bg-teal-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.full_name}</p>
                      <p className="text-xs text-slate-400">Patient {r.mrn ? `· ${r.mrn}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 mt-8">No results for &ldquo;{searchQuery}&rdquo;</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
