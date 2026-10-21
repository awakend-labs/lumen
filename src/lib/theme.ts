export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function themeStorageKey(userId?: string) {
  return userId ? `lumen-theme:${userId}` : "theme";
}

// Keep this a literal script: serializing functions lets the Worker bundler inject
// helpers (such as __name) that do not exist in the browser's inline-script scope.
export function themeBootstrapScript(theme: ThemePreference | null, storageKey: string) {
  const settings = JSON.stringify({ theme, storageKey }).replace(/</g, "\\u003c");
  return `(()=>{var s=${settings},t=s.theme;try{if(!t)t=localStorage.getItem(s.storageKey)||localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"&&t!=="system")t="system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(r);d.style.colorScheme=r;try{localStorage.setItem(s.storageKey,t)}catch(e){}})()`;
}
