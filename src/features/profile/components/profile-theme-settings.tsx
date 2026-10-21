"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useThemePreference } from "@/components/theme-preference-provider";
import { isThemePreference } from "@/lib/theme";

const subscribe = () => () => {};

export function ProfileThemeSettings() {
  const { theme, setTheme, isSaving } = useThemePreference();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [saved, setSaved] = useState(false);

  return (
    <section aria-labelledby="profile-theme-heading" className="grid gap-5 border-t border-border px-5 py-7 sm:px-7 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
      <div>
        <SunIcon className="mb-3 size-4 text-muted-foreground" aria-hidden />
        <h2 id="profile-theme-heading" className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">Your default theme, saved to your account across devices.</p>
      </div>
      <fieldset disabled={!hydrated || isSaving} className="flex min-w-0 flex-col gap-4">
        <legend className="mb-3 text-sm font-medium">Default theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "light", label: "Light", icon: SunIcon },
            { value: "dark", label: "Dark", icon: MoonIcon },
            { value: "system", label: "System", icon: MonitorIcon },
          ].map(option => (
            <label key={option.value} className="relative flex cursor-pointer flex-col items-center gap-2 rounded-md border border-border px-2 py-4 text-xs text-muted-foreground has-checked:border-primary has-checked:bg-primary/10 has-checked:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-wait has-disabled:opacity-60">
              <input type="radio" name="profile-theme" value={option.value} checked={hydrated && theme === option.value} className="sr-only" onChange={async event => {
                const next = event.target.value;
                if (!isThemePreference(next)) return;
                setSaved(false);
                setSaved(await setTheme(next));
              }} />
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">System follows your device’s light or dark appearance. Changes save automatically.</p>
        <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
          {isSaving ? "Saving theme…" : saved ? <><CheckIcon className="size-3.5 text-accent-foreground" aria-hidden />Default theme saved.</> : null}
        </p>
      </fieldset>
    </section>
  );
}
