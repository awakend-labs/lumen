import { NextResponse } from "next/server";
import { requireUser } from "@/server/access";
import { acceptInvitation } from "@/server/collaboration";
import { handle } from "@/server/http";

type Context = { params: Promise<{ token: string }> };

export function POST(_request: Request, context: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { token } = await context.params;
    return NextResponse.json(await acceptInvitation(user, token));
  });
}
