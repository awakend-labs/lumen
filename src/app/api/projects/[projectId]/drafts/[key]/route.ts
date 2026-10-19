import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { clearEndpointDraft, draftInputSchema, draftKeySchema, getEndpointDraft, saveEndpointDraft } from "@/server/endpoint-drafts";

type Context = { params: Promise<{ projectId: string; key: string }> };
export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser(); const { projectId, key } = await context.params;
    return NextResponse.json(await getEndpointDraft(user.id, projectId, draftKeySchema.parse(key)));
  });
}
export function PUT(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser(); const { projectId, key } = await context.params;
    return NextResponse.json(await saveEndpointDraft(user.id, projectId, draftKeySchema.parse(key), draftInputSchema.parse(await readJson(request))));
  });
}
export function DELETE(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser(); const { projectId, key } = await context.params;
    const { revision } = z.object({ revision: z.uuid() }).parse(await readJson(request));
    return NextResponse.json(await clearEndpointDraft(user.id, projectId, draftKeySchema.parse(key), revision));
  });
}
