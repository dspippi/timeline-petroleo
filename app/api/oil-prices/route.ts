import { NextResponse } from "next/server";
import { getOilPrices } from "@/lib/oilPrice";

// Revalidate at most once per hour
export const revalidate = 3600;

export async function GET() {
  const prices = await getOilPrices();
  const body = prices.map((p) => ({
    date: p.date.toISOString().slice(0, 10),
    price: p.price,
  }));
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
