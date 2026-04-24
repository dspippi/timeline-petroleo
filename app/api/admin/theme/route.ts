import { NextRequest, NextResponse } from "next/server";
import { getThemeConfig, saveThemeConfig, ThemeConfig } from "@/lib/theme";

export async function GET() {
  try {
    return NextResponse.json(getThemeConfig());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: ThemeConfig = await req.json();

    if (!body || !body.light || !body.dark) {
      return NextResponse.json({ error: "Invalid theme payload" }, { status: 400 });
    }

    saveThemeConfig(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
