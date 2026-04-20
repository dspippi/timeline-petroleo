import { NextRequest, NextResponse } from "next/server";
import { listCategories, saveCategories, Category } from "@/lib/categories";

// GET /api/admin/categories
export async function GET() {
  try {
    return NextResponse.json(listCategories());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/admin/categories  — replaces the full list
export async function PUT(req: NextRequest) {
  try {
    const body: Category[] = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Payload must be an array" }, { status: 400 });
    }

    for (const cat of body) {
      if (!cat.id || typeof cat.id !== "string") {
        return NextResponse.json({ error: "Each category must have a string id" }, { status: 400 });
      }
      if (!cat.label || typeof cat.label !== "string") {
        return NextResponse.json({ error: `Category "${cat.id}" is missing a label` }, { status: 400 });
      }
      if (!cat.color || !/^#[0-9a-fA-F]{6}$/.test(cat.color)) {
        return NextResponse.json({ error: `Category "${cat.id}" has an invalid color (use #rrggbb)` }, { status: 400 });
      }
      // Sanitize id: only alphanumeric + dash + underscore
      if (!/^[a-z0-9_-]+$/.test(cat.id)) {
        return NextResponse.json(
          { error: `ID "${cat.id}" is invalid. Use only lowercase letters, numbers, - and _` },
          { status: 400 }
        );
      }
    }

    // Ensure no duplicate ids
    const ids = body.map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "Duplicate category IDs found" }, { status: 400 });
    }

    saveCategories(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
