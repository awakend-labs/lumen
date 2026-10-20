import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { inferResponseSchema } from "@/lib/response-contract";
import type { ResponseDoc } from "@/lib/types";
import { HttpError } from "./http";

export async function prepareResponseDocs(projectId: string, responses: ResponseDoc[]): Promise<ResponseDoc[]> {
  if (responses.some(response => response.useSharedError)) {
    const [project] = await db.select({ format: projects.responseErrorFormat }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project?.format) throw new HttpError(400, "Define the project error format before using it in a response.");
  }
  return responses.map(response => {
    if (response.useSharedError) return { statusCode: response.statusCode, description: response.description, useSharedError: true, isSuccess: false };
    if (response.body !== undefined && (response.schemaMode === "generated" || response.schema === undefined)) {
      return { ...response, schema: inferResponseSchema(response.body), schemaSource: undefined, schemaMode: "generated" };
    }
    return response;
  });
}
