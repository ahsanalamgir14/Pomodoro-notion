import { NextRequest, NextResponse } from "next/server";
import { shouldIgnore } from "./utils/routes";

const anonymousRoutes = [
  "/login",
  "/signup",
  "/auth/error",
  "/auth/verify-request",
]; // Routes accessible without authentication

//https://stackoverflow.com/a/73845472/4919370

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Allow bypassing auth for testing when Firebase/auth is disabled
  const disableAuth = process.env.NEXT_PUBLIC_DISABLE_FIREBASE === "true" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
  if (disableAuth) {
    return NextResponse.next();
  }

  // Skip middleware for ignored routes (privacy, terms, about, static assets) and all API endpoints
  if (shouldIgnore(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow anonymous routes like login/signup and embed views (iframes have no cookies)
  if (anonymousRoutes.includes(pathname) || pathname.startsWith("/embed")) {
    return NextResponse.next();
  }

  // If a persistent Notion connection cookie exists, allow access
  const notionConnected = req.cookies.get("notion_connected")?.value === "1";
  if (notionConnected) {
    return NextResponse.next();
  }

  // Check cookie-based session
  const sessionUser = req.cookies.get("session_user")?.value;
  const sessionToken = req.cookies.get("session_token")?.value;
  const nextAuthCookie = req.cookies.get("next-auth.session-token")?.value || req.cookies.get("__Secure-next-auth.session-token")?.value;
  if (!sessionUser && !sessionToken && !nextAuthCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve intended destination to return post-login
    const dest = pathname + (req.nextUrl.search || "");
    url.searchParams.set("redirect", dest);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // run middleware for all paths except next internals and common public assets
    "/((?!_next/static|_next/image|favicon.ico|icon-192x192.png|icon-256x256.png|icon-384x384.png|icon-512x512.png|manifest.json|sounds|workers).*)",
  ],
};
