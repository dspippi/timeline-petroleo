"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { OilEvent } from "@/types";
import { useCategories } from "@/context/CategoriesContext";
import { formatEventDate } from "@/lib/utils";

interface Props {
  events: OilEvent[];
  onEventClick: (event: OilEvent) => void;
}

const LABEL_W = 120;
const YEAR_H = 28;
const LEGEND_H = 36;
const PADDING_YEARS = 2;
const RIGHT_PX_EXTRA = 52; // extra pixels after last event so right-edge chips don't clip
const CHIP_H = 16;
const BAR_W = 3;
const BAR_H = 8;
const CHIP_BAR_GAP = 2;
const SLOT_ITEM_H = CHIP_H + CHIP_BAR_GAP + BAR_H; // 26px — content per slot
const MIN_SLOT_H = CHIP_H + 2 + 3 + 2; // 23px — chip + gap + min 3px bar + bottom pad
const APPROX_CHIP_W = 68; // used for collision detection

interface Tooltip {
  event: OilEvent;
  x: number;
  y: number;
  alignRight: boolean;
}

interface PlacedEvent {
  event: OilEvent;
  x: number;
  sublane: number;
}

/** Greedy lane assignment — events whose chips overlap horizontally get different lanes. */
function assignSublanes(events: OilEvent[], toX: (d: Date) => number): PlacedEvent[] {
  const sorted = [...events]
    .map((e) => ({ event: e, x: toX(e.start_date) }))
    .sort((a, b) => a.x - b.x);

  const laneEnds: number[] = [];

  return sorted.map(({ event, x }) => {
    const left = x - APPROX_CHIP_W / 2;
    const right = x + APPROX_CHIP_W / 2;
    let lane = laneEnds.findIndex((end) => left > end + 3);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = right;
    return { event, x, sublane: lane };
  });
}

export function OverviewPanel({ events, onEventClick }: Props) {
  const { getColor, getLabel } = useCategories();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Group by region
  const { regions, byRegion } = useMemo(() => {
    const map: Record<string, OilEvent[]> = {};
    for (const e of events) (map[e.region] ??= []).push(e);
    const regions = Object.keys(map).sort((a, b) => a.localeCompare(b, "pt"));
    return { regions, byRegion: map };
  }, [events]);

  // Legend: unique types present
  const legendTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.type));
    return [...types].sort((a, b) => getLabel(a).localeCompare(getLabel(b), "pt"));
  }, [events, getLabel]);

  // Time scale
  const { minTime, pxPerMs } = useMemo(() => {
    if (events.length === 0 || size.w <= LABEL_W) return { minTime: 0, pxPerMs: 0 };
    const times = events.map((e) => e.start_date.getTime());
    const padMs = PADDING_YEARS * 365.25 * 24 * 3600 * 1000;
    const minTime = Math.min(...times) - padMs;
    const maxTime = Math.max(...times) + padMs;
    return { minTime, pxPerMs: (size.w - LABEL_W - RIGHT_PX_EXTRA) / (maxTime - minTime) };
  }, [events, size.w]);

  const toX = (date: Date) => (date.getTime() - minTime) * pxPerMs;

  // Year marks
  const yearMarks = useMemo(() => {
    if (!pxPerMs) return [];
    const times = events.map((e) => e.start_date.getTime());
    const padMs = PADDING_YEARS * 365.25 * 24 * 3600 * 1000;
    const startYear = new Date(Math.min(...times) - padMs).getFullYear();
    const endYear   = new Date(Math.max(...times) + padMs).getFullYear();
    const span = endYear - startYear;
    const step = span > 100 ? 20 : span > 50 ? 10 : span > 20 ? 5 : 2;
    const marks: { year: number; x: number }[] = [];
    for (let y = Math.ceil(startYear / step) * step; y <= endYear; y += step) {
      const x = (new Date(y, 0, 1).getTime() - minTime) * pxPerMs;
      if (x >= 0) marks.push({ year: y, x });
    }
    return marks;
  }, [events, minTime, pxPerMs]);

  // Per-region sublane assignments
  const regionData = useMemo(() => {
    if (!pxPerMs) return regions.map((r) => ({ region: r, placed: [] as PlacedEvent[], numSublanes: 1 }));
    return regions.map((region) => {
      const placed = assignSublanes(byRegion[region], toX);
      const numSublanes = placed.length > 0 ? Math.max(...placed.map((p) => p.sublane + 1)) : 1;
      return { region, placed, numSublanes };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, byRegion, pxPerMs, minTime]);

  // Height allocation: divide available space evenly across all sublanes
  const totalSublanes = regionData.reduce((s, r) => s + r.numSublanes, 0);
  const bordersH = regions.length; // 1px border per row
  const availableH = Math.max(0, size.h - YEAR_H - LEGEND_H - bordersH);
  // Fill the viewport exactly; never below MIN_SLOT_H (chip + 2px padding each side)
  const slotH = totalSublanes > 0
    ? Math.max(MIN_SLOT_H, availableH / totalSublanes)
    : MIN_SLOT_H;
  // Bar height adapts to available slot space (always at least 3px)
  const barH = Math.max(3, Math.min(BAR_H, slotH - CHIP_H - CHIP_BAR_GAP - 4));

  if (events.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-content-muted">
        Nenhum evento corresponde aos filtros selecionados.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-app px-4 pt-3 pb-0 select-none"
    >
      {/* Year axis */}
      <div className="flex shrink-0" style={{ height: YEAR_H }}>
        <div style={{ width: LABEL_W, flexShrink: 0 }} />
        <div className="relative flex-1">
          {yearMarks.map(({ year, x }) => (
            <div
              key={year}
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{ left: x, transform: "translateX(-50%)" }}
            >
              <span className="font-mono text-[9px] font-medium text-content-tertiary whitespace-nowrap">
                {year}
              </span>
              <div className="mt-0.5 h-1.5 w-px bg-line-strong" />
            </div>
          ))}
        </div>
      </div>

      {/* Rows — height proportional to number of sublanes */}
      {regionData.map(({ region, placed, numSublanes }) => {
        const rowH = numSublanes * slotH;

        return (
          <div
            key={region}
            className="flex border-t border-line shrink-0"
            style={{ height: rowH }}
          >
            {/* Region label */}
            <div
              className="shrink-0 pr-3 pt-2 text-[10px] font-semibold text-content-secondary truncate leading-tight"
              style={{ width: LABEL_W }}
            >
              {region}
            </div>

            {/* Plot area */}
            <div className="relative flex-1 overflow-visible">
              {/* Year gridlines */}
              {yearMarks.map(({ year, x }) => (
                <div
                  key={year}
                  className="absolute inset-y-0 w-px bg-line pointer-events-none"
                  style={{ left: x }}
                />
              ))}

              {/* Events — each placed in its sublane slot */}
              {placed.map(({ event, x, sublane }) => {
                const color = getColor(event.type);
                const slotTop = sublane * slotH;
                // Chip sits 2px from top of slot; bar always follows below
                const chipY = slotTop + 2;
                const barY  = chipY + CHIP_H + CHIP_BAR_GAP;

                return (
                  <button
                    key={event.id}
                    type="button"
                    className="absolute group hover:z-20 p-0 border-0 bg-transparent cursor-pointer"
                    style={{ left: x, top: 0, width: 1, height: rowH }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        event, x: rect.left, y: rect.top,
                        alignRight: rect.left > window.innerWidth / 2,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { setTooltip(null); onEventClick(event); }}
                  >
                    {/* Chip label */}
                    <div
                      className="absolute -translate-x-1/2 rounded-full whitespace-nowrap overflow-hidden text-ellipsis font-medium leading-none opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{
                        top: chipY,
                        fontSize: 8.5,
                        padding: "2.5px 5px",
                        height: CHIP_H,
                        display: "flex",
                        alignItems: "center",
                        color,
                        border: `1px solid ${color}55`,
                        background: `${color}13`,
                        maxWidth: 84,
                      }}
                    >
                      {event.title}
                    </div>

                    {/* Bar anchor — always visible, height adapts to slot size */}
                    <div
                      className="absolute -translate-x-1/2 rounded-[2px] opacity-60 group-hover:opacity-90 transition-opacity"
                      style={{
                        top: barY,
                        width: BAR_W,
                        height: barH,
                        backgroundColor: color,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Bottom border */}
      <div className="shrink-0 border-t border-line" />

      {/* Legend */}
      <div
        className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 px-1"
        style={{ height: LEGEND_H, paddingTop: 8 }}
      >
        {legendTypes.map((type) => {
          const color = getColor(type);
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="rounded-full shrink-0"
                style={{ width: 7, height: 7, backgroundColor: color, opacity: 0.8 }}
              />
              <span className="text-[9px] text-content-tertiary font-medium">
                {getLabel(type)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-line-strong bg-surface px-3 py-2 shadow-lg max-w-[260px]"
          style={
            tooltip.alignRight
              ? { right: window.innerWidth - tooltip.x + 8, top: tooltip.y - 52 }
              : { left: tooltip.x + 8, top: tooltip.y - 52 }
          }
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="rounded-full shrink-0"
              style={{ width: 6, height: 6, backgroundColor: getColor(tooltip.event.type) }}
            />
            <span className="text-[9px] font-semibold" style={{ color: getColor(tooltip.event.type) }}>
              {getLabel(tooltip.event.type)}
            </span>
          </div>
          <p className="text-xs font-semibold text-content-primary leading-snug">
            {tooltip.event.title}
          </p>
          <p className="mt-0.5 text-[10px] text-content-tertiary">
            {formatEventDate(tooltip.event.start_date, tooltip.event.end_date)}
            {" · "}
            {tooltip.event.country}
          </p>
        </div>
      )}
    </div>
  );
}
