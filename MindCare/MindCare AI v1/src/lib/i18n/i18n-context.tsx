'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import translations, { type Locale } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored === 'en' || stored === 'ro') {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => translations[locale]?.[key] ?? translations.en[key] ?? key,
    [locale]
  );

  // Prevent hydration mismatch by rendering with default locale until mounted
  const contextValue: I18nContextValue = {
    locale: mounted ? locale : 'en',
    setLocale,
    t: mounted ? t : (key) => translations.en[key] ?? key,
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ro' : 'en')}
      className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
      title={locale === 'en' ? 'Switch to Romanian' : 'Switch to English'}
    >
      <span className={locale === 'en' ? 'font-bold text-blue-600' : ''}>EN</span>
      <span className="text-gray-300">|</span>
      <span className={locale === 'ro' ? 'font-bold text-blue-600' : ''}>RO</span>
    </button>
  );
}
