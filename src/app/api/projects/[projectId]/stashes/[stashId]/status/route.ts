import { NextResponse } from "next/server";
import { stashStatusSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { setStashStatus } from "@/server/stashes";

type Context = { params: Promise<{ projectId: string; stashId: string }> };

export function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId, stashId } = await context.params;
    const input = stashStatusSchema.parse(await readJson(request));
    return NextResponse.json(
      await setStashStatus(user.id, projectId, stashId, input.status),
    );
  });
}
