import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/super-admin",
  "/estate-admin",
  "/resident",
  "/guard",
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const url = new URL("/auth/sign-in", req.url);
    return NextResponse.redirect(url);
  }

  try {
    const session = await verifySession(token);

    // Privileged users must complete MFA setup.
    const isPrivileged = session.role === "SUPER_ADMIN" || session.role === "ESTATE_ADMIN";
    if (isPrivileged && !session.mfaEnabled) {
      const url = new URL("/auth/mfa-setup", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = new URL("/auth/sign-in", req.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/super-admin/:path*",
    "/estate-admin/:path*",
    "/resident/:path*",
    "/guard/:path*",
  ],
};
