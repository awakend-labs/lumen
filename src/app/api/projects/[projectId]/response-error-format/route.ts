import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { responseErrorFormatSchema } from "@/lib/validators";
import { inferResponseSchema } from "@/lib/response-contract";
import { requireEditor, requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";

export function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    await requireEditor(user.id, projectId);
    const input = responseErrorFormatSchema.parse(await readJson(request));
    const responseErrorFormat = input.schemaMode === "custom" && input.schema !== undefined
      ? input : { ...input, schema: inferResponseSchema(input.body), schemaSource: undefined, schemaMode: "generated" as const };
    await db.update(projects).set({ responseErrorFormat, updatedAt: new Date() }).where(eq(projects.id, projectId));
    return NextResponse.json(responseErrorFormat);
  });
}
