import { NextResponse } from "next/server";
import { apiGroupInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { saveApiGroup } from "@/server/api-groups";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ projectId: string; stashId: string }> };

export function POST(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId } = await context.params;
    const { name } = apiGroupInputSchema.parse(await readJson(request));
    return NextResponse.json(await saveApiGroup(user.id, projectId, stashId, name), { status: 201 });
  });
}
