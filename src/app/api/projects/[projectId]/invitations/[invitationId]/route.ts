import { NextResponse } from "next/server";
import { requireUser } from "@/server/access";
import { revokeInvitation } from "@/server/collaboration";
import { handle } from "@/server/http";

type Context = { params: Promise<{ projectId: string; invitationId: string }> };

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, invitationId } = await context.params;
    await revokeInvitation(user.id, projectId, invitationId);
    return new NextResponse(null, { status: 204 });
  });
}
