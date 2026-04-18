import { OilPrice } from "@/types";
import { parseISO, isValid, fromUnixTime } from "date-fns";

let _cache: OilPrice[] | null = null;

async function loadFallback(): Promise<OilPrice[]> {
  const fallback = (await import("@/data/oil-prices-fallback.json")).default as {
    date: string;
    price: number;
  }[];
  return fallback
    .map((d) => {
      const date = parseISO(d.date);
      if (!isValid(date)) return null;
      return { date, price: d.price } as OilPrice;
    })
    .filter((x): x is OilPrice => x !== null);
}

export async function getOilPrices(): Promise<OilPrice[]> {
  if (_cache) return _cache;

  // In browser context, Yahoo Finance is blocked by CORS and EIA requires a key.
  // Use the static fallback immediately for instant, reliable loading.
  if (typeof window !== "undefined") {
    _cache = await loadFallback();
    return _cache;
  }

  // Server context: try live APIs first.

  // 1. Try EIA API (requires API key in .env.local)
  const apiKey = process.env.NEXT_PUBLIC_EIA_API_KEY;
  if (apiKey) {
    try {
      const url =
        `https://api.eia.gov/v2/petroleum/pri/spt/data/` +
        `?api_key=${apiKey}` +
        `&frequency=monthly` +
        `&data[0]=value` +
        `&facets[series][]=RBRTE` +
        `&sort[0][column]=period` +
        `&sort[0][direction]=asc` +
        `&offset=0&length=5000`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const rows: { period: string; value: string }[] = json?.response?.data ?? [];
        const parsed = rows
          .map((d) => {
            const date = parseISO(d.period + "-01");
            const price = parseFloat(d.value);
            if (!isValid(date) || isNaN(price)) return null;
            return { date, price } as OilPrice;
          })
          .filter((x): x is OilPrice => x !== null);
        if (parsed.length > 0) {
          _cache = parsed;
          return _cache;
        }
      }
    } catch {
      // Fall through
    }
  }

  // 2. Try Yahoo Finance (server-side only — no CORS restriction)
  try {
    const now = Math.floor(Date.now() / 1000);
    const start = 536457600; // 1987-01-01
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1mo&period1=${start}&period2=${now}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp ?? [];
      const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
      if (timestamps.length > 10) {
        const parsed = timestamps
          .map((t, i) => {
            const price = closes[i];
            if (price == null || isNaN(price)) return null;
            return { date: fromUnixTime(t), price: Math.round(price * 100) / 100 } as OilPrice;
          })
          .filter((x): x is OilPrice => x !== null);
        if (parsed.length > 0) {
          _cache = parsed;
          return _cache;
        }
      }
    }
  } catch {
    // Fall through to static fallback
  }

  // 3. Static JSON fallback
  _cache = await loadFallback();
  return _cache;
}
