"use client";

import { memo, useCallback, RefObject, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
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

// margin.left = LABEL_WIDTH - Y_AXIS_WIDTH so that the plot area starts at exactly LABEL_WIDTH
// This aligns the chart x=0 with the timeline event area left edge (1:1 pixel mapping)
const Y_AXIS_WIDTH = 40;
const CHART_MARGIN_LEFT = LABEL_WIDTH - Y_AXIS_WIDTH; // = 72

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
      <div className="shrink-0 h-28 flex items-center justify-center border-b border-black/[0.07] bg-gray-50">
        <span className="text-gray-400 text-xs">Carregando dados de preço…</span>
      </div>
    );
  }

  // SVG width = totalWidthPx + LABEL_WIDTH; plot area = totalWidthPx → 1:1 pixel mapping
  const xDomain: [number, number] = [0, scale.totalWidthPx];

  return (
    <div
      ref={scrollRef}
      className="timeline-scroll shrink-0 overflow-x-auto border-b border-black/[0.07] bg-white relative"
      style={{ height: 120 }}
      onScroll={onScroll}
    >
      <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, height: 120, position: "relative" }}>

        {/* "No data" zone — diagonal stripes before first price data point */}
        {noDataEndPx > 0 && (
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none overflow-hidden"
            style={{
              left: LABEL_WIDTH,
              width: noDataEndPx,
            }}
          >
            {/* Diagonal stripe pattern via CSS */}
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
          height={120}
          data={data}
          onMouseMove={handleMouseMove as (e: unknown) => void}
          onMouseLeave={handleMouseLeave}
          margin={{ top: 8, right: 0, bottom: 4, left: CHART_MARGIN_LEFT }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="rgba(0,0,0,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="x"
            type="number"
            domain={xDomain}
            hide
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#9ca3af", fontSize: 9, fontFamily: "monospace" }}
            tickFormatter={(v: number) => `$${v}`}
            tickLine={false}
            axisLine={false}
            width={Y_AXIS_WIDTH}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
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
    </div>
  );
});
