"use client";

import { useState } from "react";
import { Globe } from "lucide-react";

interface MultiLanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "ro", label: "Romanian" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "uk", label: "Ukrainian" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
];

export function MultiLanguageSelector({ value, onChange }: MultiLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = SUPPORTED_LANGUAGES.find((l) => l.code === value) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-medical-border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="w-3.5 h-3.5 text-medical-muted" />
        <span className="text-medical-text">{selected.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-medical-border rounded-lg shadow-lg max-h-64 overflow-y-auto w-48">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${lang.code === value ? "bg-brand-50 text-brand-700 font-medium" : "text-medical-text"}`}
                onClick={() => { onChange(lang.code); setIsOpen(false); }}
              >
                {lang.label}
                {lang.code !== "auto" && <span className="text-xs text-medical-muted ml-1">({lang.code})</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
