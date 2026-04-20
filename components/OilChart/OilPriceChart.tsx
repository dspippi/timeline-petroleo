"use client";

import { memo, useCallback, RefObject, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis } from "recharts";
import { OilPrice, TimelineScale } from "@/types";
import { useHoveredDate, useSetHoveredDate } from "@/context/TimelineSyncContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABEL_WIDTH } from "@/components/Timeline/TimelineRows";

interface OilShock {
  id: number;
  name: string;
  date: Date;
  effect: "up" | "down";
}

const OIL_SHOCKS: OilShock[] = [
  { id: 1, name: "Embargo Árabe",        date: new Date(1973, 9, 17),  effect: "up" },
  { id: 2, name: "Revolução Iraniana",   date: new Date(1979, 0, 16),  effect: "up" },
  { id: 3, name: "Crise do Golfo",       date: new Date(1990, 7, 2),   effect: "up" },
  { id: 4, name: "Pico de 2008",         date: new Date(2008, 6, 3),   effect: "up" },
  { id: 5, name: "Colapso do Xisto",     date: new Date(2014, 5, 20),  effect: "down" },
  { id: 6, name: "COVID-19",             date: new Date(2020, 3, 20),  effect: "down" },
  { id: 7, name: "Guerra Rússia-Ucrânia",date: new Date(2022, 1, 24),  effect: "up" },
  { id: 8, name: "Estreito de Hormuz",   date: new Date(2026, 2, 1),   effect: "up" },
];

function findPriceAt(prices: OilPrice[], targetDate: Date): number | null {
  if (!prices.length) return null;
  const targetMs = targetDate.getTime();
  let closest: OilPrice | null = null;
  let minDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(p.date.getTime() - targetMs);
    if (diff < minDiff) { minDiff = diff; closest = p; }
  }
  if (minDiff > 180 * 86_400_000) return null;
  return closest?.price ?? null;
}

interface Props {
  prices: OilPrice[];
  scale: TimelineScale;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
}

interface ChartPoint {
  x: number;
  price: number;
  yNorm: number;
  date: Date;
}

const CHART_HEIGHT = 99;
const CHART_MARGIN = { top: 8, right: 0, bottom: 4, left: LABEL_WIDTH };

function priceToY(price: number, domain: [number, number]): number {
  const plotH = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const [lo, hi] = domain;
  return CHART_MARGIN.top + plotH * (1 - (price - lo) / (hi - lo));
}

function niceYAxis(minP: number, maxP: number): { domain: [number, number]; ticks: number[] } {
  const pad = Math.max((maxP - minP) * 0.08, 2);
  const rawLo = Math.max(0, minP - pad);
  const rawHi = maxP + pad;
  const range = rawHi - rawLo;
  const step = range > 200 ? 50 : range > 80 ? 20 : range > 40 ? 10 : range > 15 ? 5 : range > 6 ? 2 : 1;
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);
  return { domain: [lo, hi], ticks };
}

// ── ChartHoverOverlay ─────────────────────────────────────────────────────────
// Isolated component: only re-renders when hoveredDate changes (~60fps).
// Keeps Recharts completely out of the hot path.
interface HoverOverlayProps {
  prices: OilPrice[];
  yDomain: [number, number];
  scale: TimelineScale;
}

const ChartHoverOverlay = memo(function ChartHoverOverlay({ prices, yDomain, scale }: HoverOverlayProps) {
  const hoveredDate = useHoveredDate();
  if (!hoveredDate) return null;

  const hoveredX    = scale.toPixel(hoveredDate);
  const hoveredPrice = findPriceAt(prices, hoveredDate);

  return (
    <>
      {/* Vertical reference line */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: hoveredX + LABEL_WIDTH, width: 1, background: "rgba(0,0,0,0.25)", zIndex: 10 }}
      />

      {/* Price bubble */}
      {hoveredPrice !== null && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: hoveredX + LABEL_WIDTH,
            top: priceToY(hoveredPrice, yDomain),
            zIndex: 18,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 5px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 6,
              padding: "3px 7px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              whiteSpace: "nowrap",
            }}
          >
            <div className="font-semibold text-amber-700" style={{ fontSize: 11 }}>
              ${hoveredPrice.toFixed(2)}/bbl
            </div>
            <div className="text-gray-400" style={{ fontSize: 10 }}>
              {format(hoveredDate, "MMM yyyy", { locale: ptBR })}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// ── Main chart (heavy Recharts component) ─────────────────────────────────────
// Does NOT subscribe to hoveredDate → only re-renders when prices or scale change.
export const OilPriceChart = memo(function OilPriceChart({
  prices,
  scale,
  scrollRef,
  onScroll,
}: Props) {
  const setHoveredDate = useSetHoveredDate();
  const [activeShock, setActiveShock] = useState<number | null>(null);

  const { yDomain, yTicks } = useMemo(() => {
    if (prices.length === 0) return { yDomain: [0, 160] as [number, number], yTicks: [40, 80, 120, 160] };
    const minP = Math.min(...prices.map((p) => p.price));
    const maxP = Math.max(...prices.map((p) => p.price));
    const { domain, ticks } = niceYAxis(minP, maxP);
    return { yDomain: domain, yTicks: ticks };
  }, [prices]);

  const data = useMemo<ChartPoint[]>(() => {
    const [lo, hi] = yDomain;
    const range = Math.max(hi - lo, 1);
    return prices.map((p) => ({
      x:     scale.toPixel(p.date),
      price: p.price,
      yNorm: (p.price - lo) / range,
      date:  p.date,
    }));
  }, [prices, scale, yDomain]);

  const handleMouseMove = useCallback(
    (e: { activePayload?: { payload: ChartPoint }[] }) => {
      if (e?.activePayload?.[0]) setHoveredDate(e.activePayload[0].payload.date);
    },
    [setHoveredDate]
  );

  const handleMouseLeave = useCallback(() => setHoveredDate(null), [setHoveredDate]);

  const shockMarkers = useMemo(() =>
    OIL_SHOCKS.flatMap((shock) => {
      const price = findPriceAt(prices, shock.date);
      if (price === null) return [];
      return [{ ...shock, price, x: scale.toPixel(shock.date) + LABEL_WIDTH, y: priceToY(price, yDomain) }];
    }),
    [prices, scale, yDomain]
  );

  const noDataEndPx = prices.length > 0 ? scale.toPixel(prices[0].date) : 0;
  const xDomain: [number, number] = [0, scale.totalWidthPx];

  if (prices.length === 0) {
    return (
      <div className="shrink-0 flex items-center justify-center border-b border-black/[0.07] bg-gray-50" style={{ height: CHART_HEIGHT }}>
        <span className="text-gray-400 text-xs">Carregando dados de preço…</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="shrink-0 overflow-x-hidden border-b border-black/[0.07] bg-white relative"
      style={{ height: CHART_HEIGHT }}
      onScroll={onScroll}
    >
      <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, height: CHART_HEIGHT, position: "relative" }}>

        {/* Chart */}
        <div style={{ position: "absolute", inset: 0 }}>

          {/* "No data" zone */}
          {noDataEndPx > 0 && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none overflow-hidden"
              style={{ left: LABEL_WIDTH, width: noDataEndPx, zIndex: 5 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(0,0,0,0.035) 5px, rgba(0,0,0,0.035) 6px)",
                }}
              />
              <span
                className="absolute text-[9px] font-medium whitespace-nowrap"
                style={{ bottom: 6, left: 6, color: "rgba(0,0,0,0.18)" }}
              >
                sem dados disponíveis
              </span>
            </div>
          )}

          {/* Recharts — no longer re-renders on hover */}
          <LineChart
            width={scale.totalWidthPx + LABEL_WIDTH}
            height={CHART_HEIGHT}
            data={data}
            onMouseMove={handleMouseMove as (e: unknown) => void}
            onMouseLeave={handleMouseLeave}
            margin={CHART_MARGIN}
          >
            <XAxis dataKey="x" type="number" domain={xDomain} hide />
            <YAxis domain={[0, 1]} hide allowDataOverflow />
            <Line
              type="monotone"
              dataKey="yNorm"
              stroke="#d97706"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </div>

        {/* Hover overlay — lightweight component that re-renders at 60fps */}
        <ChartHoverOverlay prices={prices} yDomain={yDomain} scale={scale} />

        {/* Oil shock markers */}
        {shockMarkers.map((shock) => {
          const isUp    = shock.effect === "up";
          const color   = isUp ? "#dc2626" : "#2563eb";
          const isActive = activeShock === shock.id;
          const tooltipBelow = shock.y < 32;
          const size = 18;
          return (
            <div
              key={shock.id}
              style={{
                position: "absolute",
                left: shock.x - size / 2,
                top:  shock.y - size / 2,
                width: size,
                height: size,
                cursor: "pointer",
                pointerEvents: "auto",
                zIndex: 16,
                filter: isActive
                  ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px ${color}cc)`
                  : `drop-shadow(0 0 4px ${color}99)`,
                transition: "filter 0.15s ease, transform 0.15s ease",
                transform: isActive ? "scale(1.25)" : "scale(1)",
              }}
              onMouseEnter={() => setActiveShock(shock.id)}
              onMouseLeave={() => setActiveShock(null)}
            >
              <svg width={size} height={size} viewBox="0 0 18 18" overflow="visible">
                <path d="M9 1 L17 9 L9 17 L1 9 Z" fill={color} stroke="white" strokeWidth="1.5" opacity={isActive ? 1 : 0.88} />
                {isUp
                  ? <path d="M9 5.5 L12.5 11 L5.5 11 Z" fill="white" />
                  : <path d="M9 12.5 L12.5 7 L5.5 7 Z" fill="white" />
                }
              </svg>
              {isActive && (
                <div style={{
                  position: "absolute",
                  ...(tooltipBelow ? { top: "calc(100% + 5px)" } : { bottom: "calc(100% + 5px)" }),
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(15,15,15,0.88)",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "3px 7px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  borderLeft: `2px solid ${color}`,
                  lineHeight: 1.4,
                  zIndex: 99,
                }}>
                  {shock.name}
                  <span style={{ color, marginLeft: 4 }}>{isUp ? "▲" : "▼"}</span>
                  <div style={{ color: "#d97706", fontSize: 9, marginTop: 2, fontWeight: 600 }}>
                    ${shock.price.toFixed(2)}/bbl
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Sticky Y-axis overlay */}
        <div
          className="pointer-events-none"
          style={{
            position: "sticky", left: 0, top: 0,
            width: LABEL_WIDTH, height: CHART_HEIGHT,
            zIndex: 20, background: "white",
            borderRight: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {yTicks.map((price) => (
            <div
              key={price}
              className="absolute"
              style={{
                right: 6, top: priceToY(price, yDomain) - 5,
                fontSize: 9, fontFamily: "monospace",
                color: "#9ca3af", lineHeight: 1, userSelect: "none",
              }}
            >
              ${price}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
