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
