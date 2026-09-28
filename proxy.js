import { NextResponse } from "next/server";
import { ROLE_HOME, ROLE_PREFIXES, SESSION_HINT_COOKIE } from "@/constants";

const PROTECTED = ["/super-admin", "/company", "/device", "/employee"];

/**
 * UX-level route guard. It only reads a non-secret role hint cookie to avoid flashes of protected UI and to
 * send people to the right home. It is NOT a security boundary: every API call is authorised by the backend.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(SESSION_HINT_COOKIE)?.value;

  if (pathname === "/") {
    // An installed attendance-device app (start_url "/") lands straight on the scanner once signed in.
    return NextResponse.redirect(new URL(role && ROLE_HOME[role] ? ROLE_HOME[role] : "/login", request.url));
  }
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!role || !ROLE_HOME[role]) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!ROLE_PREFIXES[role].some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/super-admin/:path*", "/company/:path*", "/device/:path*", "/employee/:path*"] };
