"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ScrivaLogo } from "@/components/ui/ScrivaLogo";
import { GoogleButton } from "@/components/ui/GoogleButton";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const timeoutReason = searchParams.get("reason") === "timeout";
  const rawError = searchParams.get("error");
  // Ignore stale/generic errors that are no longer relevant after switching to OAuth redirect
  const urlError =
    rawError && !rawError.includes("invalid_callback") && !rawError.includes("missing_code")
      ? decodeURIComponent(rawError)
      : null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputClass =
    "mt-2 block w-full rounded-lg border border-medical-border bg-gray-50 px-4 py-3 text-medical-text placeholder-medical-muted transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50";

  return (
    <div className="w-full max-w-md">
      <div className="surface-elevated p-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <ScrivaLogo size={48} />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">Scriva</span>
            </h1>
            <p className="mt-0.5 text-sm text-medical-muted">Clinical AI for European Healthcare</p>
            <p className="mt-2 text-sm text-medical-muted">{t("auth.signInToAccount")}</p>
          </div>
        </div>

        {urlError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Sign-in failed</p>
              <p className="mt-0.5 text-xs text-amber-700">{urlError}</p>
            </div>
            <button
              onClick={() => router.replace("/auth/signin")}
              className="text-amber-500 transition hover:text-amber-700"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {timeoutReason && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">{t("auth.sessionExpired")}</p>
          </div>
        )}

        {/* Google Sign-In */}
        <div className="mb-5">
          <GoogleButton label="Continue with Google" />
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-medical-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-medical-muted">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

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
            <label htmlFor="password" className="block text-sm font-semibold text-medical-text">
              {t("auth.password")}
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="block w-full rounded-lg border border-medical-border bg-gray-50 px-4 py-3 pr-12 text-medical-text placeholder-medical-muted transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-medical-muted transition hover:text-medical-text"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-sm font-medium text-brand-600 transition hover:text-brand-700">
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("auth.signingIn")}
              </span>
            ) : (
              t("auth.signIn")
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-medical-muted">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/signup" className="font-semibold text-brand-600 transition hover:text-brand-700">
            {t("auth.signUp")}
          </Link>
        </p>

        <div className="mt-4 flex justify-center">
          <LanguageSwitcher />
        </div>

        <div className="mt-4 text-center">
          <Link href="/book" className="text-sm text-medical-muted transition hover:text-brand-600">
            📅 Book an appointment as a patient
          </Link>
        </div>

        {/* GDPR badge */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-medical-muted">
          <svg className="h-3 w-3 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          GDPR Compliant · EU Data Residency
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-medical-bg p-4">
      <Suspense fallback={
        <div className="w-full max-w-md">
          <div className="surface-elevated p-8 text-center text-medical-muted">Loading…</div>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
