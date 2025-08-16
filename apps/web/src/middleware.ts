import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  // Define protected routes
  const protectedRoutes = ["/", "/onboarding", "/jobs/:path*"];
  const authRoutes = ["/sign-in", "/sign-up"];

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes(":path*")) {
      const baseRoute = route.replace("/:path*", "");
      return request.nextUrl.pathname.startsWith(baseRoute);
    }
    return request.nextUrl.pathname === route;
  });

  const isAuthRoute = authRoutes.includes(request.nextUrl.pathname);

  // If no session cookie exists and user is trying to access protected routes
  if (!sessionCookie && isProtectedRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // If user has session cookie and tries to access auth pages, redirect to dashboard
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up", "/onboarding", "/jobs/:path*"],
};
