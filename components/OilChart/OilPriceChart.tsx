"use client";

import { memo, useCallback, RefObject, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { OilPrice, TimelineScale } from "@/types";
import { useTimelineSync } from "@/context/TimelineSyncContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABEL_WIDTH } from "@/components/Timeline/TimelineRows";

interface Props {
  prices: OilPrice[];
  scale: TimelineScale;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
}

interface ChartPoint {
  x: number;
  price: number;
  date: Date;
}

// Plot area starts at exactly LABEL_WIDTH from the left edge of the SVG.
// The Recharts YAxis is hidden; we render our own sticky Y-axis overlay instead.
const Y_PRICE_DOMAIN: [number, number] = [0, 160];
const Y_PRICE_TICKS = [40, 80, 120, 160];
// No horizontal scrollbar: the container uses overflow-x:hidden and is scrolled
// programmatically in sync with the timeline. CHART_HEIGHT is the sole height constant.
const CHART_HEIGHT = 99; // ≈ 117 × 0.85 — 15% smaller than previous 117px
const CHART_MARGIN = { top: 8, right: 0, bottom: 4, left: LABEL_WIDTH };

/** Convert a price value to its Y pixel coordinate within the chart SVG */
function priceToY(price: number): number {
  const plotH = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  return CHART_MARGIN.top + plotH * (1 - price / Y_PRICE_DOMAIN[1]);
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 shadow-md rounded px-2 py-1 text-xs">
      <div className="font-semibold text-amber-700">${d.price.toFixed(2)}/bbl</div>
      <div className="text-gray-400">{format(d.date, "MMM yyyy", { locale: ptBR })}</div>
    </div>
  );
};

export const OilPriceChart = memo(function OilPriceChart({
  prices,
  scale,
  scrollRef,
  onScroll,
}: Props) {
  const { hoveredDate, setHoveredDate } = useTimelineSync();

  // x = scale.toPixel(date) — used directly as chart coordinate (plot area starts at LABEL_WIDTH via margin)
  const data = useMemo<ChartPoint[]>(
    () =>
      prices.map((p) => ({
        x: scale.toPixel(p.date),
        price: p.price,
        date: p.date,
      })),
    [prices, scale]
  );

  const handleMouseMove = useCallback(
    (e: { activePayload?: { payload: ChartPoint }[] }) => {
      if (e?.activePayload?.[0]) {
        setHoveredDate(e.activePayload[0].payload.date);
      }
    },
    [setHoveredDate]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredDate(null);
  }, [setHoveredDate]);

  const hoveredX = hoveredDate ? scale.toPixel(hoveredDate) : null;

  // "No data" zone: from scale pixel 0 (domainStart) to first price data point
  const noDataEndPx =
    prices.length > 0 ? scale.toPixel(prices[0].date) : 0;

  if (prices.length === 0) {
    return (
      <div className="shrink-0 flex items-center justify-center border-b border-black/[0.07] bg-gray-50" style={{ height: CHART_HEIGHT }}>
        <span className="text-gray-400 text-xs">Carregando dados de preço…</span>
      </div>
    );
  }

  // SVG width = totalWidthPx + LABEL_WIDTH; plot area = totalWidthPx → 1:1 pixel mapping
  const xDomain: [number, number] = [0, scale.totalWidthPx];

  return (
    <div
      ref={scrollRef}
      className="shrink-0 overflow-x-hidden border-b border-black/[0.07] bg-white relative"
      style={{ height: CHART_HEIGHT }}
      onScroll={onScroll}
    >
      <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, height: CHART_HEIGHT, position: "relative" }}>

        {/* Chart — absolutely positioned so the sticky Y-axis can sit on top */}
        <div style={{ position: "absolute", inset: 0 }}>

          {/* "No data" zone — diagonal stripes before first price data point */}
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

          <LineChart
            width={scale.totalWidthPx + LABEL_WIDTH}
            height={CHART_HEIGHT}
            data={data}
            onMouseMove={handleMouseMove as (e: unknown) => void}
            onMouseLeave={handleMouseLeave}
            margin={CHART_MARGIN}
          >
            <XAxis dataKey="x" type="number" domain={xDomain} hide />
            <YAxis domain={Y_PRICE_DOMAIN} ticks={Y_PRICE_TICKS} hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            {/* Horizontal reference lines every $20 */}
            {Y_PRICE_TICKS.map((price) => (
              <ReferenceLine
                key={price}
                y={price}
                stroke="rgba(0,0,0,0.10)"
                strokeWidth={1}
              />
            ))}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#d97706"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            {hoveredX !== null && (
              <ReferenceLine
                x={hoveredX}
                stroke="rgba(0,0,0,0.3)"
                strokeDasharray="3 3"
              />
            )}
          </LineChart>
        </div>

        {/* Sticky Y-axis overlay — stays pinned to left edge while scrolling horizontally */}
        <div
          className="pointer-events-none"
          style={{
            position: "sticky",
            left: 0,
            top: 0,
            width: LABEL_WIDTH,
            height: CHART_HEIGHT,
            zIndex: 20,
            background: "white",
            borderRight: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {Y_PRICE_TICKS.map((price) => {
            const y = priceToY(price);
            return (
              <div
                key={price}
                className="absolute"
                style={{
                  right: 6,
                  top: y - 5,
                  fontSize: 9,
                  fontFamily: "monospace",
                  color: "#9ca3af",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                ${price}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
