import { NextResponse } from "next/server";
import { requireUser } from "@/server/access";
import { listMembers } from "@/server/collaboration";
import { handle } from "@/server/http";

type Context = { params: Promise<{ projectId: string }> };

export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    return NextResponse.json(await listMembers(user.id, projectId));
  });
}
