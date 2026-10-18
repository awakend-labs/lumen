import { NextResponse } from "next/server";
import { projectStatusSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { setProjectStatus } from "@/server/projects";

type Context = { params: Promise<{ projectId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = projectStatusSchema.parse(await readJson(request));
    return NextResponse.json(await setProjectStatus(user.id, projectId, input.status));
  });
}
