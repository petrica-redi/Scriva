"use client";

import { useTranslation } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const { locale, setLocale, t } = useTranslation();

  if (dark) {
    return (
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "ro" : "en")}
        className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[13px] font-medium text-white/50 transition hover:bg-white/8 hover:text-white/70"
        title={t("lang.language")}
      >
        <Globe className="h-3.5 w-3.5 text-white/35" />
        <span>{locale === "en" ? "🇬🇧 English" : "🇷🇴 Română"}</span>
        <span className="ml-auto text-[10px] text-white/25">switch</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "ro" : "en")}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      title={t("lang.language")}
    >
      <Globe className="h-4 w-4 text-slate-500" />
      {compact ? (
        <span className="uppercase">{locale}</span>
      ) : (
        <span>{locale === "en" ? t("lang.ro") : t("lang.en")}</span>
      )}
    </button>
  );
}
