"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { PRACTICE_COUNTRIES } from "@/lib/practiceCountries";

const SPECIALTIES = [
  // Mental Health & Healing
  "Psychiatry",
  "Psychology",
  "Clinical Psychology",
  "Psychotherapy",
  "Counseling",
  "Art Therapy",
  "Music Therapy",
  "Occupational Therapy",
  "Speech & Language Therapy",
  "Behavioral Therapy",
  // Medical Specialties
  "General Practice",
  "Internal Medicine",
  "Family Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Endocrinology",
  "ENT (Otolaryngology)",
  "Gastroenterology",
  "Geriatrics",
  "Neurology",
  "Obstetrics & Gynecology",
  "Oncology",
  "Ophthalmology",
  "Orthopedics",
  "Pain Management",
  "Physical Medicine & Rehabilitation",
  "Pulmonology",
  "Radiology",
  "Rheumatology",
  "Sleep Medicine",
  "Surgery",
  "Urology",
  // Alternative & Complementary
  "Acupuncture",
  "Chiropractic",
  "Homeopathy",
  "Naturopathy",
  "Osteopathy",
  "Nutrition & Dietetics",
  // Dental
  "Dentistry",
  "Orthodontics",
  "Other",
];

const inputClass =
  "mt-2 block w-full rounded-lg border border-medical-border bg-gray-50 px-4 py-3 text-medical-text placeholder-medical-muted transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50";

const selectClass =
  "mt-2 block w-full rounded-lg border border-medical-border bg-gray-50 px-4 py-3 text-medical-text transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50";

export default function SignUpPage() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [practiceCountry, setPracticeCountry] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          specialty,
          practice_country: practiceCountry || undefined,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setConfirmationSent(true);
    setLoading(false);
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-medical-bg p-4">
        <div className="w-full max-w-md">
          <div className="surface-elevated p-8">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-brand-100 p-3">
                <svg className="h-6 w-6 text-brand-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-medical-text">{t("auth.checkEmail")}</h1>
              <p className="mt-2 text-sm text-medical-muted">
                {t("auth.confirmationSent")} <span className="font-medium text-medical-text">{email}</span>
              </p>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm text-medical-text">{t("auth.confirmInstructions")}</p>
              <p className="mt-2 text-xs text-medical-muted">{t("auth.noEmail")}</p>
            </div>
            <p className="mt-6 text-center text-sm text-medical-muted">
              {t("auth.haveAccount")}{" "}
              <Link href="/auth/signin" className="font-semibold text-brand-600 transition hover:text-brand-700">
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-medical-bg p-4">
      <div className="w-full max-w-md">
        <div className="surface-elevated p-8">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h2l3-6 4 12 3-6h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-medical-text">Scriva</h1>
              <p className="mt-1 text-sm text-medical-muted">{t("auth.createAccount")}</p>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="mb-5 flex w-full items-center justify-center gap-3 rounded-lg border border-medical-border bg-white px-4 py-3 text-sm font-medium text-medical-text transition hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-medical-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-medical-muted">or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-medical-text">
                {t("auth.fullName")}
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Dr. Maria Ionescu"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-medical-text">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="doctor@clinic.eu"
              />
            </div>

            <div>
              <label htmlFor="specialty" className="block text-sm font-semibold text-medical-text">
                {t("auth.specialty")}
              </label>
              <select
                id="specialty"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                disabled={loading}
                className={selectClass}
              >
                <option value="">{t("auth.selectSpecialty")}</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="practiceCountry" className="block text-sm font-semibold text-medical-text">
                {t("auth.practiceCountry")}
              </label>
              <select
                id="practiceCountry"
                value={practiceCountry}
                onChange={(e) => setPracticeCountry(e.target.value)}
                disabled={loading}
                className={selectClass}
              >
                <option value="">{t("auth.selectCountry")}</option>
                {PRACTICE_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-medical-text">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="Minimum 8 characters"
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-medical-muted">
                <svg className={`h-3.5 w-3.5 ${password.length >= 8 ? "text-brand-600" : "text-medical-muted"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t("auth.minPassword")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName || !email || !specialty || !practiceCountry || password.length < 8}
              className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("auth.creatingAccount")}
                </span>
              ) : (
                t("auth.signUp")
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-medical-muted">
            {t("auth.haveAccount")}{" "}
            <Link href="/auth/signin" className="font-semibold text-brand-600 transition hover:text-brand-700">
              {t("auth.signIn")}
            </Link>
          </p>

          <div className="mt-4 flex justify-center">
            <LanguageSwitcher />
          </div>

          {/* GDPR badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-medical-muted">
            <svg className="h-3 w-3 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            GDPR compliant · Data processed in EU
          </div>
        </div>
      </div>
    </div>
  );
}
