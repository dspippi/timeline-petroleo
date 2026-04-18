import { NextRequest, NextResponse } from "next/server";
import { listEvents, addEvent, AdminEventInput } from "@/lib/adminEvents";
import { format } from "date-fns";

export async function GET() {
  try {
    const events = listEvents();
    // Serialize dates for JSON
    const serialized = events.map((e) => ({
      ...e,
      start_date: format(e.start_date, "yyyy-MM-dd"),
      end_date: e.end_date ? format(e.end_date, "yyyy-MM-dd") : null,
    }));
    return NextResponse.json(serialized);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AdminEventInput;
    if (!body.id || !body.title || !body.start_date) {
      return NextResponse.json({ error: "id, title e start_date são obrigatórios" }, { status: 400 });
    }
    addEvent(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
