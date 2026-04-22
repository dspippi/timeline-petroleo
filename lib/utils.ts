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

  for (const e of events) {
    if (!grouped.has(e.region)) grouped.set(e.region, new Map());
    const regionMap = grouped.get(e.region)!;
    if (!regionMap.has(e.country)) regionMap.set(e.country, []);
    regionMap.get(e.country)!.push(e);
  }

  // Sort countries within each region by event count desc, Brasil always first
  for (const [, countries] of grouped) {
    const countryEntries = Array.from(countries.entries()).sort(([ca, ea], [cb, eb]) => {
      if (isBrasil(ca) && !isBrasil(cb)) return -1;
      if (!isBrasil(ca) && isBrasil(cb)) return 1;
      return eb.length - ea.length;
    });
    countries.clear();
    for (const [country, evts] of countryEntries) countries.set(country, evts);
  }

  // Sort regions: Global first, then by event count desc
  const regionEventCount = (entries: Map<string, OilEvent[]>) =>
    Array.from(entries.values()).reduce((sum, evts) => sum + evts.length, 0);

  const sorted = Array.from(grouped.entries()).sort(([ra, ca], [rb, cb]) => {
    const order = [
      "Global",
      "América do Norte",
      "Oriente Médio",
      "América Central e do Sul",
      "Europa",
      "Ásia",
      "África",
      "Outros",
    ];

    const ia = order.indexOf(ra);
    const ib = order.indexOf(rb);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }

    // Fallback: by event count desc (keeps unknown/new regions stable-ish)
    return regionEventCount(cb) - regionEventCount(ca);
  });

  return new Map(sorted);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
