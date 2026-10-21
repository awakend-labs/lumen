"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemePreferenceProvider } from "@/components/theme-preference-provider";
import { themeStorageKey, type ThemePreference } from "@/lib/theme";

export function Providers({ children, userId, initialTheme = null }: {
  children: React.ReactNode;
  userId?: string;
  initialTheme?: ThemePreference | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" storageKey={themeStorageKey(userId)} defaultTheme={initialTheme ?? "system"} enableSystem disableTransitionOnChange
      // The root layout's literal head script handles first paint. next-themes'
      // serialized bootstrap breaks when Cloudflare injects bundler helpers.
      scriptProps={{ type: "text/plain", "data-cfasync": "false" }}>
      <ThemePreferenceProvider userId={userId} initialTheme={initialTheme}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <MotionConfig reducedMotion="user"><LazyMotion features={domAnimation} strict>{children}</LazyMotion></MotionConfig>
            <Toaster richColors closeButton />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemePreferenceProvider>
    </ThemeProvider>
  );
}
