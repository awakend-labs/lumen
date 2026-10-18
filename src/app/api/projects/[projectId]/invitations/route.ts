import { NextResponse } from "next/server";
import { invitationInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { createInvitation, listInvitations } from "@/server/collaboration";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ projectId: string }> };

export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    return NextResponse.json(await listInvitations(user.id, projectId));
  });
}

export function POST(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = invitationInputSchema.parse(await readJson(request));
    const invitation = await createInvitation(user.id, projectId, input);
    return NextResponse.json(invitation, { status: 201 });
  });
}
