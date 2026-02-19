'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import { useI18n, LanguageSwitcher } from '@/lib/i18n/i18n-context';

interface SearchResult {
  id: string;
  visit_type?: string;
  patient_name?: string;
  full_name?: string;
  status?: string;
  mrn?: string;
  match_source?: string;
}

interface HeaderProps {
  onMenuClick: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

export function Header({ onMenuClick, userEmail, onSignOut }: HeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    consultations: SearchResult[];
    notes: SearchResult[];
    patients: SearchResult[];
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search with debounce
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
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
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
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white border-b border-blue-100 flex items-center justify-between px-4 sm:px-6 z-40">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Search Bar */}
      <div ref={searchRef} className="relative hidden sm:block flex-1 max-w-md mx-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults && setShowResults(true)}
          placeholder={t('search.placeholder')}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
        />
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>

        {/* Search Results Dropdown */}
        {showResults && searchResults && totalResults > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto z-50">
            {searchResults.consultations.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">{t('search.consultations')}</p>
                {searchResults.consultations.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { router.push(`/consultation/${r.id}/note`); setShowResults(false); setSearchQuery(''); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{r.patient_name}</span>
                    <span className="text-xs text-gray-500">{r.visit_type}</span>
                  </button>
                ))}
              </div>
            )}
            {searchResults.patients.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">{t('search.patients')}</p>
                {searchResults.patients.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { router.push('/patients'); setShowResults(false); setSearchQuery(''); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{r.full_name}</span>
                    <span className="text-xs text-gray-500">{r.mrn || ''}</span>
                  </button>
                ))}
              </div>
            )}
            {searchResults.notes.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">{t('search.transcriptMatches')}</p>
                {searchResults.notes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { router.push(`/consultation/${r.id}/note`); setShowResults(false); setSearchQuery(''); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{r.patient_name}</span>
                    <span className="text-xs text-gray-500">transcript match</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {showResults && searchResults && totalResults === 0 && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg p-4 text-sm text-gray-500 text-center z-50">
            {t('search.noResults')} &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{t('notifications.title')}</p>
              </div>
              <div className="p-4 text-sm text-gray-500 text-center">
                {t('notifications.none')}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {userEmail && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userEmail}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <LanguageSwitcher />
        <button
          onClick={onSignOut}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </header>
  );
}
