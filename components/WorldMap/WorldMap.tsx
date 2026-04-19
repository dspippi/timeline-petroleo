"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { isBrasil } from "@/lib/utils";

interface CountryPath { id: string; name: string; d: string }

interface Props {
  countriesWithEvents: Set<string>;
  activeCountries: Set<string>;
  onCountryClick: (country: string) => void;
}

// Normalize event country names to match SVG aria-label names
function toSvgName(name: string): string {
  if (isBrasil(name)) return "Brazil";
  return name;
}

export const WorldMap = memo(function WorldMap({
  countriesWithEvents,
  activeCountries,
  onCountryClick,
}: Props) {
  const [paths, setPaths] = useState<CountryPath[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch("/world.svg")
      .then((r) => r.text())
      .then((svg) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const els = Array.from(doc.querySelectorAll("path"));
        setPaths(
          els
            .map((p) => ({
              id: p.getAttribute("id") ?? "",
              name: p.getAttribute("aria-label") ?? "",
              d: p.getAttribute("d") ?? "",
            }))
            .filter((p) => p.id && p.d)
        );
      })
      .catch(() => {});
  }, [mounted]);

  // Build sets of normalized SVG names for quick lookup
  const svgNamesWithEvents = useMemo(
    () => new Set(Array.from(countriesWithEvents).map(toSvgName)),
    [countriesWithEvents]
  );
  const svgNamesActive = useMemo(
    () => new Set(Array.from(activeCountries).map(toSvgName)),
    [activeCountries]
  );

  // Reverse map: svgName → original event country name (for onClick)
  const reverseMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const name of countriesWithEvents) {
      m.set(toSvgName(name), name);
    }
    return m;
  }, [countriesWithEvents]);

  const getFill = useCallback(
    (name: string) => {
      const hasActiveFilter = svgNamesActive.size > 0;
      if (svgNamesActive.has(name)) return "#d97706";
      // Brazil gets green highlight only when no country filter is active
      if (name === "Brazil" && !hasActiveFilter) return "#86efac";
      if (svgNamesWithEvents.has(name)) return "#93c5fd";
      return "#e2e8f0";
    },
    [svgNamesWithEvents, svgNamesActive]
  );

  const getStroke = useCallback(
    (name: string) => {
      const hasActiveFilter = svgNamesActive.size > 0;
      if (svgNamesActive.has(name)) return "#92400e";
      if (name === "Brazil" && !hasActiveFilter) return "#16a34a";
      if (svgNamesWithEvents.has(name)) return "#3b82f6";
      return "#cbd5e1";
    },
    [svgNamesWithEvents, svgNamesActive]
  );

  if (!mounted) return (
    <div className="shrink-0 rounded-xl border border-black/10 bg-white shadow-sm" style={{ width: 135, height: 104 }} />
  );

  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden border border-black/10 bg-white shadow-sm"
      style={{ width: 135 }}
    >
      <div className="px-3 pt-2 pb-1 text-[9px] text-gray-400 uppercase tracking-widest font-semibold">
        Mapa — clique para filtrar
      </div>
      <svg
        viewBox="0 0 1010 666"
        className="w-full h-auto"
        style={{ display: "block" }}
      >
        <rect x="0" y="0" width="1010" height="666" fill="#dbeafe" />

        {paths.map((cp) => {
          const hasEvents = svgNamesWithEvents.has(cp.name);
          const isActive = svgNamesActive.has(cp.name);
          const isBr = cp.name === "Brazil";

          return (
            <path
              key={cp.id}
              d={cp.d}
              fill={getFill(cp.name)}
              stroke={getStroke(cp.name)}
              strokeWidth={isActive || isBr ? 1.5 : 0.4}
              className={hasEvents ? "cursor-pointer" : ""}
              onClick={() => {
                if (!hasEvents) return;
                onCountryClick(reverseMap.get(cp.name) ?? cp.name);
              }}
              data-tooltip={cp.name + (hasEvents ? " (clique para filtrar)" : "")}
              style={{
                transition: "fill 0.2s, stroke 0.2s",
                opacity: hasEvents || isBr ? 1 : 0.75,
                filter: isActive ? "drop-shadow(0 0 3px #d97706)" : undefined,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
});
