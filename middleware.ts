import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/admin/login"];
const ALLOW_ADMIN_ONLINE = process.env.ALLOW_ADMIN_ONLINE === "1";

/** Compute HMAC-SHA256 using Web Crypto API (Edge-compatible) */
async function computeToken(secret: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminRoute) return NextResponse.next();

  // Admin is a local maintenance tool. In production, disable it by default.
  // Set ALLOW_ADMIN_ONLINE=1 if you intentionally want it reachable online.
  if (process.env.NODE_ENV !== "development" && !ALLOW_ADMIN_ONLINE) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // In development, skip auth entirely — admin is a local editing tool
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET ?? "dev-secret";
  const password = process.env.ADMIN_PASSWORD ?? "admin";
  const expected = await computeToken(secret, password);

  const token = request.cookies.get("admin_token")?.value;
  if (token !== expected) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
