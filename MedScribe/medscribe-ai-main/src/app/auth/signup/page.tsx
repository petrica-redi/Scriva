"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

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

export default function SignUpPage() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">{t("auth.checkEmail")}</h1>
              <p className="mt-2 text-slate-500">
                {t("auth.confirmationSent")} <span className="font-medium text-slate-700">{email}</span>
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-slate-700">
                {t("auth.confirmInstructions")}
              </p>
              <p className="text-xs text-slate-600">
                {t("auth.noEmail")}
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              {t("auth.haveAccount")}{" "}
              <Link href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900">
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                MedScribe AI
              </span>
            </h1>
            <p className="mt-2 text-slate-500">{t("auth.createAccount")}</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700">
                {t("auth.fullName")}
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                placeholder="doctor@clinic.com"
              />
            </div>

            <div>
              <label htmlFor="specialty" className="block text-sm font-semibold text-slate-700">
                {t("auth.specialty")}
              </label>
              <select
                id="specialty"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                disabled={loading}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                <option value="">{t("auth.selectSpecialty")}</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
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
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                placeholder="Minimum 12 characters"
              />
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <svg className={`h-4 w-4 ${password.length >= 8 ? "text-green-600" : "text-slate-400"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t("auth.minPassword")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName || !email || !specialty || password.length < 8}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white transition duration-200 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <p className="mt-6 text-center text-sm text-slate-600">
            {t("auth.haveAccount")}{" "}
            <Link href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700 transition">
              {t("auth.signIn")}
            </Link>
          </p>

          <div className="mt-4 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
