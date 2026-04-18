import { NextRequest, NextResponse } from "next/server";
import { readRawEvents, writeRawEvents } from "@/lib/adminEvents";

export async function GET() {
  try {
    const text = readRawEvents();
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (typeof text !== "string") {
      return NextResponse.json({ error: "Campo 'text' inválido" }, { status: 400 });
    }
    writeRawEvents(text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
