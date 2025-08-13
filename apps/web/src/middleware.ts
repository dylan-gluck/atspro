import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  // If no session cookie exists and user is trying to access protected routes
  if (!sessionCookie && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // If user has session cookie and tries to access auth pages, redirect to dashboard
  if (sessionCookie && (request.nextUrl.pathname === "/sign-in" || request.nextUrl.pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up"],
}