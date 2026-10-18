import { NextResponse } from "next/server";
import { reorderSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { reorderStashes } from "@/server/stashes";

type Context = { params: Promise<{ projectId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = reorderSchema.parse(await readJson(request));
    await reorderStashes(user.id, projectId, input.ids);
    return NextResponse.json({ ok: true });
  });
}
