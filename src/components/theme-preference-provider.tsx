"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

type ThemeContext = {
  isSaving: boolean;
  setTheme: (theme: ThemePreference) => Promise<boolean>;
};
const ThemePreferenceContext = createContext<ThemeContext | null>(null);

export function ThemePreferenceProvider({ children, userId, initialTheme }: {
  children: React.ReactNode;
  userId?: string;
  initialTheme: ThemePreference | null;
}) {
  const { theme, setTheme: applyTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(Boolean(userId && !initialTheme));
  const busy = useRef(false);
  const migration = useRef<Promise<{ theme: ThemePreference }> | null>(null);
  const migrationComplete = useRef(false);

  useEffect(() => {
    if (!userId || initialTheme || migrationComplete.current || !isThemePreference(theme)) return;
    // Reuse the request when Strict Mode replays effects.
    migration.current ??= api<{ theme: ThemePreference }>("/api/preferences/theme", {
      method: "PATCH", body: JSON.stringify({ theme, initialize: true }),
    });
    let active = true;
    migration.current.then(result => {
      if (active) { migrationComplete.current = true; applyTheme(result.theme); }
    })
      .catch(() => {
        if (active) { migrationComplete.current = true; toast.error("Could not save your default theme. Choose it again to retry."); }
      })
      .finally(() => { if (active) setIsSaving(false); });
    return () => { active = false; };
  }, [userId, initialTheme, theme, applyTheme]);

  const setTheme = useCallback(async (next: ThemePreference) => {
    if (busy.current || (userId && !initialTheme && !migrationComplete.current)) return false;
    busy.current = true;
    setIsSaving(true);
    try {
      if (userId) {
        await api("/api/preferences/theme", { method: "PATCH", body: JSON.stringify({ theme: next }) });
      }
      // Only claim/apply a signed-in choice after Postgres accepts it.
      applyTheme(next);
      return true;
    } catch {
      toast.error("Could not save your default theme. Please try again.");
      return false;
    } finally {
      busy.current = false;
      setIsSaving(false);
    }
  }, [userId, initialTheme, applyTheme]);

  return <ThemePreferenceContext.Provider value={{ isSaving, setTheme }}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const { theme } = useTheme();
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error("Theme preferences require ThemePreferenceProvider");
  return { theme, ...context };
}
