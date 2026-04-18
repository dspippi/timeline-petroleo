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
    import("@/data/oil-prices-historical.json").then((m) => m.default as { date: string; price: number }[]),
    import("@/data/oil-prices-fallback.json").then((m) => m.default as { date: string; price: number }[]),
  ]);
  // Historical covers 1960–1986, fallback covers 1987–present
  return [...parseJsonPrices(hist), ...parseJsonPrices(fallback)];
}

async function fetchEia2025Plus(): Promise<OilPrice[]> {
  const apiKey = process.env.NEXT_PUBLIC_EIA_API_KEY;
  if (!apiKey) return [];
  try {
    const url =
      `https://api.eia.gov/v2/petroleum/pri/spt/data/` +
      `?api_key=${apiKey}` +
      `&frequency=monthly` +
      `&data[0]=value` +
      `&facets[series][]=RBRTE` +
      `&start=2025-01` +
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

  // Browser: use static data immediately (no CORS issues)
  if (typeof window !== "undefined") {
    _cache = await loadBase();
    return _cache;
  }

  // Server: combine static base with live EIA data for 2025+
  const [base, live] = await Promise.all([loadBase(), fetchEia2025Plus()]);

  if (live.length === 0) {
    _cache = base;
    return _cache;
  }

  // Merge: keep all base data, append live 2025+ points not already in base
  const lastBaseDate = base[base.length - 1]?.date.getTime() ?? 0;
  const newPoints = live.filter((p) => p.date.getTime() > lastBaseDate);
  _cache = [...base, ...newPoints];
  return _cache;
}
