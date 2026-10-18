import { NextResponse } from "next/server";
import { stashInputSchema } from "@/lib/validators";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { createStash } from "@/server/stashes";

type Context = { params: Promise<{ projectId: string }> };

export function POST(request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    const input = stashInputSchema.parse(await readJson(request));
    const stash = await createStash(user.id, projectId, input);
    return NextResponse.json(stash, { status: 201 });
  });
}
