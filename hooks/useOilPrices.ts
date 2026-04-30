"use client";

import { useState, useEffect } from "react";
import { OilPrice } from "@/types";
import { isValid, parseISO } from "date-fns";
import { withBasePath } from "@/lib/basePath";

interface OilPriceRow {
  date: string;
  price: number;
}

function normalizeRows(rows: OilPriceRow[]): OilPrice[] {
  return rows
    .map((row) => {
      const date = parseISO(row.date);
      if (!isValid(date) || typeof row.price !== "number" || Number.isNaN(row.price)) {
        return null;
      }
      return { date, price: row.price };
    })
    .filter((row): row is OilPrice => row !== null);
}

async function loadBundledPrices(): Promise<OilPrice[]> {
  const [hist, fallback] = await Promise.all([
    import("@/data/oil-prices-owid-historical.json").then((m) => m.default as OilPriceRow[]),
    import("@/data/oil-prices-fallback.json").then((m) => m.default as OilPriceRow[]),
  ]);
  return normalizeRows([...hist, ...fallback]);
}

export function useOilPrices() {
  const [prices, setPrices] = useState<OilPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(withBasePath("/api/oil-prices"), { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as OilPriceRow[];
        if (cancelled) return;
        setPrices(normalizeRows(data));
        setLoading(false);
        setError(null);
      } catch (apiErr) {
        try {
          const bundled = await loadBundledPrices();
          if (cancelled) return;
          setPrices(bundled);
          setLoading(false);
          setError(null);
          console.warn("Oil price API failed; using bundled fallback data instead.", apiErr);
        } catch (fallbackErr) {
          if (cancelled) return;
          setError(String(fallbackErr ?? apiErr));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { prices, loading, error };
}
