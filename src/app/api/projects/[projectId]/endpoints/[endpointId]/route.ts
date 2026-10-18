import { NextResponse } from "next/server";
import { endpointInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { deleteEndpoint, getEndpoint, updateEndpoint } from "@/server/projects";

type Context = { params: Promise<{ projectId: string; endpointId: string }> };

export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, endpointId } = await context.params;
    return NextResponse.json(await getEndpoint(user.id, projectId, endpointId));
  });
}

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, endpointId } = await context.params;
    const input = endpointInputSchema.parse(await readJson(request));
    return NextResponse.json(
      await updateEndpoint(user.id, projectId, endpointId, input),
    );
  });
}

export function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, endpointId } = await context.params;
    await deleteEndpoint(user.id, projectId, endpointId);
    return new NextResponse(null, { status: 204 });
  });
}
