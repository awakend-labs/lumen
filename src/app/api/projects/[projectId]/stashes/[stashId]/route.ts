import { renameStash } from "@/server/rename";
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
    const body = await readJson(request);
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "name" in body) {
      const name = stashInputSchema.shape.name.parse(body.name);
      return NextResponse.json(await renameStash(user.id, projectId, stashId, name));
    }
    const input = stashInputSchema.parse(body);
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
