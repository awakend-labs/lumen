import { NextResponse } from "next/server";
import { requireUser } from "@/server/access";
import { getProjectSummary } from "@/server/projects";
import { handle } from "@/server/http";

export function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await params;
    return NextResponse.json(await getProjectSummary(user.id, projectId));
  });
}
