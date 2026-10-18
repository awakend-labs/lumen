import { NextResponse } from "next/server";
import { stashInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { deleteStash, updateStash } from "@/server/stashes";

type Context = { params: Promise<{ projectId: string; stashId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId } = await context.params;
    const input = stashInputSchema.parse(await readJson(request));
    return NextResponse.json(await updateStash(user.id, projectId, stashId, input));
  });
}

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId } = await context.params;
    await deleteStash(user.id, projectId, stashId);
    return new NextResponse(null, { status: 204 });
  });
}
