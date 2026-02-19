"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { I18nProvider } from "@/lib/i18n/i18n-context";

function SessionTimeoutWrapper({ children }: { children: ReactNode }) {
  useSessionTimeout();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SessionTimeoutWrapper>{children}</SessionTimeoutWrapper>
        </I18nProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
