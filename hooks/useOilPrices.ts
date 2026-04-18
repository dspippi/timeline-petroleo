"use client";

import { useState, useEffect } from "react";
import { OilPrice } from "@/types";
import { getOilPrices } from "@/lib/oilPrice";

export function useOilPrices() {
  const [prices, setPrices] = useState<OilPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOilPrices()
      .then((data) => {
        if (!cancelled) {
          setPrices(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, loading, error };
}
