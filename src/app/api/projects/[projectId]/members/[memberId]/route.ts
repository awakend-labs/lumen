import { NextResponse } from "next/server";
import { memberRoleSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { removeMember, updateMemberRole } from "@/server/collaboration";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ projectId: string; memberId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, memberId } = await context.params;
    const input = memberRoleSchema.parse(await readJson(request));
    await updateMemberRole(user.id, projectId, memberId, input.role);
    return NextResponse.json({ ok: true });
  });
}

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, memberId } = await context.params;
    await removeMember(user.id, projectId, memberId);
    return new NextResponse(null, { status: 204 });
  });
}
