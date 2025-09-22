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

  // For custom auth, we'll check if user data exists in localStorage
  // Since middleware runs on server-side, we'll allow all routes and let client-side handle auth
  // This is a simplified approach - in production you might want to use JWT tokens in cookies
  const isAuthenticated = true; // Temporarily allow all routes

  // if not authenticated and accessing login route then allow
  if (!isAuthenticated) {
    if (anonymousRoutes.findIndex((r) => pathname.startsWith(r)) != -1) {
      return NextResponse.next();
    } else {
      // otherwise redirect
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (isAuthenticated) {
    // if authenticated and accessing login page then redirect
    if (anonymousRoutes.findIndex((r) => pathname.startsWith(r)) != -1) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    } else {
      // otherwise allow
      return NextResponse.next();
    }
  }
}
