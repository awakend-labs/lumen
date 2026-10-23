import { renameEndpoint } from "@/server/rename";
import { NextResponse } from "next/server";
import { z } from "zod";
import { endpointInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { deleteEndpoint, getEndpoint, moveEndpoint, moveEndpointToGroup, updateEndpoint } from "@/server/projects";

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
    const body = await readJson(request);
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "name" in body) {
      const name = endpointInputSchema.shape.name.parse(body.name);
      return NextResponse.json(await renameEndpoint(user.id, projectId, endpointId, name));
    }
    if (body && typeof body === "object" && Object.keys(body).length === 1 && "stashId" in body) {
      const stashId = endpointInputSchema.shape.stashId.parse(body.stashId);
      return NextResponse.json(await moveEndpoint(user.id, projectId, endpointId, stashId));
    }
    if (body && typeof body === "object" && Object.keys(body).length <= 3 && "groupId" in body) {
      const input = z.object({
        stashId: endpointInputSchema.shape.stashId,
        groupId: endpointInputSchema.shape.groupId.unwrap(),
        expectedUpdatedAt: endpointInputSchema.shape.expectedUpdatedAt.unwrap(),
      }).strict().parse(body);
      return NextResponse.json(await moveEndpointToGroup(user.id, projectId, endpointId, input));
    }
    const input = endpointInputSchema.parse(body);
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
