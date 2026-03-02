"use client";

import { useTranslation } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation();

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
