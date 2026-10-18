import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { reorderEndpoints } from "@/server/projects";

const schema = z.object({
  stashId: z.uuid(),
  ids: z.array(z.uuid()).min(1),
});

type Context = { params: Promise<{ projectId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = schema.parse(await readJson(request));
    await reorderEndpoints(user.id, projectId, input.stashId, input.ids);
    return NextResponse.json({ ok: true });
  });
}
