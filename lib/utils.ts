import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OilEvent } from "@/types";

export function formatEventDate(date: Date, endDate?: Date): string {
  const fmt = (d: Date) => format(d, "dd MMM yyyy", { locale: ptBR });
  return endDate ? `${fmt(date)} – ${fmt(endDate)}` : fmt(date);
}

export function isBrasil(country: string): boolean {
  const c = country.toLowerCase().trim();
  return c === "brasil" || c === "brazil";
}

export function groupEventsByRegion(
  events: OilEvent[]
): Map<string, Map<string, OilEvent[]>> {
  const grouped = new Map<string, Map<string, OilEvent[]>>();

  // Brasil always first inside South America
  const sorted = [...events].sort((a, b) => {
    if (isBrasil(a.country) && !isBrasil(b.country)) return -1;
    if (!isBrasil(a.country) && isBrasil(b.country)) return 1;
    return 0;
  });

  for (const e of sorted) {
    if (!grouped.has(e.region)) grouped.set(e.region, new Map());
    const regionMap = grouped.get(e.region)!;
    if (!regionMap.has(e.country)) regionMap.set(e.country, []);
    regionMap.get(e.country)!.push(e);
  }
  return grouped;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function findNearestPrice(
  prices: { date: Date; price: number }[],
  target: Date
): { date: Date; price: number } | null {
  if (prices.length === 0) return null;
  let best = prices[0];
  let bestDelta = Math.abs(target.getTime() - best.date.getTime());
  for (const p of prices) {
    const delta = Math.abs(target.getTime() - p.date.getTime());
    if (delta < bestDelta) {
      bestDelta = delta;
      best = p;
    }
  }
  return best;
}
