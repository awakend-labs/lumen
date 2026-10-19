import { NextResponse } from "next/server";
import { apiGroupInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { deleteApiGroup, saveApiGroup } from "@/server/api-groups";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ projectId: string; stashId: string; groupId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId, groupId } = await context.params;
    const { name } = apiGroupInputSchema.parse(await readJson(request));
    return NextResponse.json(await saveApiGroup(user.id, projectId, stashId, name, groupId));
  });
}

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId, groupId } = await context.params;
    await deleteApiGroup(user.id, projectId, stashId, groupId);
    return new NextResponse(null, { status: 204 });
  });
}
