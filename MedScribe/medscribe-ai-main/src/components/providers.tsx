"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { I18nProvider } from "@/lib/i18n/context";

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
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SessionTimeoutWrapper>{children}</SessionTimeoutWrapper>
      </QueryClientProvider>
    </I18nProvider>
  );
}
