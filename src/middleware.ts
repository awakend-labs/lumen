import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Keep the Edge middleware convention: Next 16's proxy switches to Node.js,
// whose middleware support is still experimental in the Cloudflare adapter.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname, search } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/projects");

  if (!sessionCookie && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Only the public landing page uses a cookie-presence shortcut. Auth pages
  // validate the real session so an expired cookie cannot create a redirect loop.
  if (sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/projects/:path*"],
};
