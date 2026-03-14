"use client";

import { I18nProvider } from "@/lib/i18n/context";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <I18nProvider>{children}</I18nProvider>
    </ErrorBoundary>
  );
}
