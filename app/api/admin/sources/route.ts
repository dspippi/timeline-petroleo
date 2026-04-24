import { NextRequest, NextResponse } from "next/server";
import { listSources, saveSources, Source } from "@/lib/sources";

export async function GET() {
  try {
    return NextResponse.json(listSources());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: Source[] = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
    }

    // Ensure no duplicate ids
    const ids = body.map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "Duplicate source IDs found" }, { status: 400 });
    }

    saveSources(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
