import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files (icons, sw.js, manifest) and API routes, which check auth themselves.
  matcher: ["/((?!_next/static|_next/image|api/|.*\\.(?:svg|png|ico|js|webmanifest)$).*)"],
};
