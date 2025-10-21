import { NextRequest, NextResponse } from "next/server";
import { shouldIgnore } from "./utils/routes";

const anonymousRoutes = [
  //   "/",
  "/login",
  "/register",
  "/auth/error",
  "/auth/verify-request",
]; // The whitelisted routes

//https://stackoverflow.com/a/73845472/4919370

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  // ignore api _next static files and publicpathname
  if (
    // ignore all api routes
    shouldIgnore(pathname)
  ) {
    return NextResponse.next();
  }

  // Simplified: Allow all routes without authentication
  // App now works directly with Notion connection
  return NextResponse.next();
}

export const config = {
  matcher: [
    // run middleware for all paths except next internals and common public assets
    "/((?!_next/static|_next/image|favicon.ico|icon-192x192.png|icon-256x256.png|icon-384x384.png|icon-512x512.png|manifest.json|sounds|workers).*)",
  ],
};
