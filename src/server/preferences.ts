import { eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import type { ViewMode } from "@/lib/types";
import type { ThemePreference } from "@/lib/theme";

export const getThemePreference = cache(async (userId: string): Promise<ThemePreference | null> => {
  const [row] = await db.select({ theme: userPreferences.theme })
    .from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return row?.theme ?? null;
});

export async function setThemePreference(userId: string, theme: ThemePreference, initialize = false) {
  const [row] = await db.insert(userPreferences).values({ userId, theme })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { theme },
      // Another device may already have migrated or explicitly saved a choice.
      ...(initialize ? { setWhere: isNull(userPreferences.theme) } : {}),
    }).returning({ theme: userPreferences.theme });
  return { theme: row?.theme ?? await getThemePreference(userId) };
}

export async function getEndpointView(userId: string): Promise<ViewMode> {
  const [row] = await db
    .select({ endpointView: userPreferences.endpointView })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return row?.endpointView === "list" ? "list" : "grid";
}

export async function setEndpointView(userId: string, endpointView: ViewMode) {
  await db
    .insert(userPreferences)
    .values({ userId, endpointView })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { endpointView },
    });
  return { endpointView };
}
