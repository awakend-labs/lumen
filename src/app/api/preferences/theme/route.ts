import { NextResponse } from "next/server";
import { z } from "zod";
import { themePreferences } from "@/lib/theme";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { setThemePreference } from "@/server/preferences";

const schema = z.object({
  theme: z.enum(themePreferences),
  initialize: z.boolean().optional(),
});

export function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = schema.parse(await readJson(request));
    return NextResponse.json(await setThemePreference(user.id, input.theme, input.initialize));
  });
}
