import { NextResponse } from "next/server";
import { projectBaseUrlSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { updateProjectBaseUrl } from "@/server/projects";

export function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = projectBaseUrlSchema.parse(await readJson(request));
    return NextResponse.json(await updateProjectBaseUrl(user.id, projectId, input));
  });
}
