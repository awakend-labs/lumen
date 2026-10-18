import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import type { ViewMode } from "@/lib/types";

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
