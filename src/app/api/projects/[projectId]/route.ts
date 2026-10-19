import { renameProject } from "@/server/rename";
import { NextResponse } from "next/server";
import { projectInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import {
  deleteProject,
  getProjectDetail,
  updateProject,
} from "@/server/projects";

type Context = { params: Promise<{ projectId: string }> };

export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    return NextResponse.json(await getProjectDetail(user.id, projectId));
  });
}

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = await readJson(request);
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "name" in body) {
      const name = projectInputSchema.shape.name.parse(body.name);
      return NextResponse.json(await renameProject(user.id, projectId, name));
    }
    const input = projectInputSchema.parse(body);
    return NextResponse.json(await updateProject(user.id, projectId, input));
  });
}

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    await deleteProject(user.id, projectId);
    return new NextResponse(null, { status: 204 });
  });
}
