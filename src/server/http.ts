import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") {
    const constraint = "constraint" in cause ? String(cause.constraint) : "";
    const message = constraint.includes("route_uidx") ? "This method and path already exist in this project and version" : constraint.includes("name_uidx") ? "An endpoint with this name already exists in this project and version" : "This record already exists";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong" },
    { status: 500 },
  );
}

export async function handle(action: () => Promise<Response>) {
  try {
    const response = await action();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
