import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurado" }, { status: 500 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const secret = process.env.ADMIN_SECRET ?? "dev-secret";
  const token = createHmac("sha256", secret).update(password).digest("hex");

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
