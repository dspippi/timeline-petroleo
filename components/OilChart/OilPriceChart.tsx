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

  if (prices.length === 0) {
    return (
      <div className="shrink-0 h-28 flex items-center justify-center border-b border-black/[0.07] bg-gray-50">
        <span className="text-gray-400 text-xs">Carregando dados de preço…</span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="timeline-scroll shrink-0 overflow-x-auto border-b border-black/[0.07] bg-white"
      style={{ height: 120 }}
      onScroll={onScroll}
    >
      <div style={{ width: scale.totalWidthPx, height: 120 }}>
        <LineChart
          width={scale.totalWidthPx}
          height={120}
          data={data}
          onMouseMove={handleMouseMove as (e: unknown) => void}
          onMouseLeave={handleMouseLeave}
          margin={{ top: 8, right: 16, bottom: 4, left: 44 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="rgba(0,0,0,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, scale.totalWidthPx]}
            hide
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#9ca3af", fontSize: 9, fontFamily: "monospace" }}
            tickFormatter={(v: number) => `$${v}`}
            tickLine={false}
            axisLine={false}
            width={40}
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
