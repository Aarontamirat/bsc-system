import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = new Set(["/login"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/_next/")) {
    return true;
  }

  if (pathname.startsWith("/favicon")) {
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return false;
}

function isApiRequest(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;

  const session = request.auth;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && session?.user?.id) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!session?.user?.id) {
    if (isApiRequest(pathname)) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Authentication is required.",
        },
        {
          status: 401,
        },
      );
    }

    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.user.role !== "ADMIN") {
    if (isApiRequest(pathname)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Administrator privileges are required.",
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
