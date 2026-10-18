import { NextResponse } from "next/server";
import { previewInvitation } from "@/server/collaboration";
import { handle } from "@/server/http";

type Context = { params: Promise<{ token: string }> };

export function GET(_request: Request, context: Context) {
  return handle(async () => {
    const { token } = await context.params;
    return NextResponse.json(await previewInvitation(token));
  });
}
