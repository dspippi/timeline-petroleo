"use client";

import { useState, useEffect } from "react";
import { OilPrice } from "@/types";
import { parseISO } from "date-fns";

export function useOilPrices() {
  const [prices, setPrices] = useState<OilPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/oil-prices")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ date: string; price: number }[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setPrices(data.map((d) => ({ date: parseISO(d.date), price: d.price })));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return { prices, loading, error };
}
