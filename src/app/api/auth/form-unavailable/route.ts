import { NextResponse } from "next/server";

// Never read or log a native form body. This fallback keeps credentials out of URLs.
export function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  return NextResponse.redirect(new URL(mode === "signup" ? "/signup" : "/login", request.url), 303);
}
