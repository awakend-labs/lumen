import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";
import { getEndpointView, setEndpointView } from "@/server/preferences";

const preferenceSchema = z.object({
  endpointView: z.enum(["grid", "list"]),
});

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    const endpointView = await getEndpointView(user.id);
    return NextResponse.json({ endpointView });
  });
}

export function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = preferenceSchema.parse(await readJson(request));
    return NextResponse.json(await setEndpointView(user.id, input.endpointView));
  });
}
