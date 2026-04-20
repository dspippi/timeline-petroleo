import { OilPrice } from "@/types";
import { parseISO, isValid } from "date-fns";

let _cache: OilPrice[] | null = null;

function parseJsonPrices(
  rows: { date: string; price: number }[]
): OilPrice[] {
  return rows
    .map((d) => {
      const date = parseISO(d.date);
      if (!isValid(date)) return null;
      return { date, price: d.price } as OilPrice;
    })
    .filter((x): x is OilPrice => x !== null);
}

async function loadBase(): Promise<OilPrice[]> {
  const [hist, fallback] = await Promise.all([
    import("@/data/oil-prices-owid-historical.json").then((m) => m.default as { date: string; price: number }[]),
    import("@/data/oil-prices-fallback.json").then((m) => m.default as { date: string; price: number }[]),
  ]);
  // OWID covers 1861–1986 (annual→monthly, $/barrel); fallback covers 1987–present (monthly Brent)
  return [...parseJsonPrices(hist), ...parseJsonPrices(fallback)];
}

async function fetchEiaFrom(startYearMonth: string): Promise<OilPrice[]> {
  const apiKey = process.env.NEXT_PUBLIC_EIA_API_KEY;
  if (!apiKey) return [];
  try {
    const url =
      `https://api.eia.gov/v2/petroleum/pri/spt/data/` +
      `?api_key=${apiKey}` +
      `&frequency=monthly` +
      `&data[0]=value` +
      `&facets[series][]=RBRTE` +
      `&start=${startYearMonth}` +
      `&sort[0][column]=period` +
      `&sort[0][direction]=asc` +
      `&offset=0&length=120`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: { period: string; value: string }[] = json?.response?.data ?? [];
    return rows
      .map((d) => {
        const date = parseISO(d.period + "-01");
        const price = parseFloat(d.value);
        if (!isValid(date) || isNaN(price)) return null;
        return { date, price } as OilPrice;
      })
      .filter((x): x is OilPrice => x !== null);
  } catch {
    return [];
  }
}

export async function getOilPrices(): Promise<OilPrice[]> {
  if (_cache) return _cache;

  const base = await loadBase();

  // Browser: use static data immediately (no CORS issues)
  if (typeof window !== "undefined") {
    _cache = base;
    return _cache;
  }

  // Server: fetch EIA data starting from the month after the last base entry
  const lastBase = base[base.length - 1];
  if (!lastBase) {
    _cache = base;
    return _cache;
  }

  const next = new Date(lastBase.date.getFullYear(), lastBase.date.getMonth() + 1, 1);
  const startYearMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const live = await fetchEiaFrom(startYearMonth);

  if (live.length === 0) {
    _cache = base;
    return _cache;
  }

  _cache = [...base, ...live];
  return _cache;
}
