import { NextResponse } from "next/server";
import { projectInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { createProject, listProjects } from "@/server/projects";

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    return NextResponse.json(await listProjects(user.id));
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = projectInputSchema.parse(await readJson(request));
    const project = await createProject(user.id, input);
    return NextResponse.json(project, { status: 201 });
  });
}
