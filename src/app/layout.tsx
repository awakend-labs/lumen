import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { getServerSession } from "@/server/session";
import { getThemePreference } from "@/server/preferences";
import { themeBootstrapScript, themeStorageKey } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lumen",
    template: "%s · Lumen",
  },
  description: "A calm, precise home for API documentation.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  const session = await getServerSession();
  const userId = session?.user.id;
  const theme = userId ? await getThemePreference(userId) : null;
  const explicitTheme = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html
      lang="en"
      className={`h-full antialiased${explicitTheme ? ` ${explicitTheme}` : ""}`}
      style={explicitTheme ? { colorScheme: explicitTheme } : undefined}
      suppressHydrationWarning
    >
      <head>
        <script id="lumen-theme" data-cfasync="false" dangerouslySetInnerHTML={{
          __html: themeBootstrapScript(theme, themeStorageKey(userId)),
        }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers key={userId ?? "anonymous"} userId={userId} initialTheme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
