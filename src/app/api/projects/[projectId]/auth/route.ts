import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { projectAuthSchema } from "@/lib/validators";
import { requireOwner, requireUser } from "@/server/access";
import { handle, readJson } from "@/server/http";

export function PUT(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await context.params;
    await requireOwner(user.id, projectId);
    const auth = projectAuthSchema.parse(await readJson(request));
    await db.update(projects).set({ auth, updatedAt: new Date() }).where(eq(projects.id, projectId));
    return NextResponse.json(auth);
  });
}
