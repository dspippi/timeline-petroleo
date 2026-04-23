"use client";

import { useMemo, RefObject } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { groupEventsByRegion, isBrasil } from "@/lib/utils";
import { EventMarker } from "./EventMarker";
import { useSettings } from "@/context/SettingsContext";

export const ROW_HEIGHT = 72; // default; runtime value comes from settings
const REGION_HEADER_MIN_HEIGHT = 22;
export const LABEL_WIDTH = 112;

// How wide (in px) each event "claims" horizontally to detect overlap
const POINT_HALF = 65;      // half label width for point events
const INTERVAL_GAP = 6;     // buffer for interval events
const LABEL_AFTER_BAR = 124; // label width + gap for short intervals (must match EventMarker)

const RENDER_BUFFER = 500; // px extra além da viewport para evitar pop-in

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
  scrollRef: RefObject<HTMLDivElement>;
  onEventClick: (e: OilEvent) => void;
  onTypeFilter: (type: EventType) => void;
}

type RowItem =
  | { kind: "region-header"; region: string }
  | { kind: "country-row"; country: string; events: OilEvent[] };

function assignLanes(
  events: OilEvent[],
  scale: TimelineScale
): { lanes: number[]; totalLanes: number } {
  if (events.length === 0) return { lanes: [], totalLanes: 1 };

  const indexed = events.map((e, i) => ({
    i,
    startPx: scale.toPixel(e.start_date),
    endPx: e.end_date ? scale.toPixel(e.end_date) : scale.toPixel(e.start_date),
    isInterval: !!e.end_date,
  })).sort((a, b) => a.startPx - b.startPx);

  const laneAssignments = new Array(events.length).fill(0);
  const laneEndPx: number[] = [];

  for (const { i, startPx, endPx, isInterval } of indexed) {
    const barWidth = endPx - startPx;
    const labelExtendsAfter = isInterval && barWidth <= 60;
    const footprintStart = isInterval ? startPx - INTERVAL_GAP : startPx - POINT_HALF;
    const footprintEnd = !isInterval
      ? startPx + POINT_HALF
      : labelExtendsAfter
        ? endPx + LABEL_AFTER_BAR
        : endPx + INTERVAL_GAP;

    let assignedLane = -1;
    for (let l = 0; l < laneEndPx.length; l++) {
      if (laneEndPx[l] <= footprintStart) {
        assignedLane = l;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = laneEndPx.length;
      laneEndPx.push(0);
    }

    laneAssignments[i] = assignedLane;
    laneEndPx[assignedLane] = Math.max(laneEndPx[assignedLane] ?? 0, footprintEnd);
  }

  return { lanes: laneAssignments, totalLanes: Math.max(1, laneEndPx.length) };
}

export function TimelineRows({ events, scale, scrollRef, onEventClick, onTypeFilter }: Props) {
  const { settings } = useSettings();
  const rowHeight = settings.rowHeight;

  const rows = useMemo<RowItem[]>(() => {
    const grouped = groupEventsByRegion(events);
    const items: RowItem[] = [];
    Array.from(grouped.entries()).forEach(([region, countries]) => {
      items.push({ kind: "region-header", region });
      Array.from(countries.entries()).forEach(([country, evts]) => {
        items.push({ kind: "country-row", country, events: evts });
      });
    });
    return items;
  }, [events]);

  // Viewport range in plot-space pixels (excluding LABEL_WIDTH offset)
  const scrollEl = scrollRef.current;
  const visStart = (scrollEl?.scrollLeft ?? 0) - RENDER_BUFFER;
  const visEnd = (scrollEl?.scrollLeft ?? 0) + (scrollEl?.clientWidth ?? 2000) + RENDER_BUFFER;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-[#526173] text-sm">
        Nenhum evento corresponde aos filtros selecionados.
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {rows.map((row, i) => {
        if (row.kind === "region-header") {
          return (
            <div
              key={`region-${row.region}`}
              className="flex items-center border-b border-black/[0.04] dark:border-[#1d2a36] bg-[#f5f3ee] dark:bg-[#0a1119]"
              style={{ minHeight: REGION_HEADER_MIN_HEIGHT, width: "100%" }}
            >
              <div
                className="sm:sticky left-0 z-10 bg-[#f5f3ee] dark:bg-[#0a1119] px-2 py-1 flex items-center"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="text-[9px] font-bold text-gray-400 dark:text-[#8896a8] uppercase tracking-[0.08em] leading-tight break-words">
                  {row.region}
                </span>
              </div>
              <div className="flex-1 h-px bg-black/[0.05] dark:bg-[#1d2a36]" />
            </div>
          );
        }

        const brasil = isBrasil(row.country);
        const { lanes, totalLanes } = assignLanes(row.events, scale);
        const totalRowHeight = rowHeight * totalLanes;

        return (
          <div
            key={`country-${row.country}-${i}`}
            className={`relative flex items-stretch border-b border-black/[0.04] dark:border-[#1d2a36] group ${
              brasil
                ? "bg-amber-50 dark:bg-[#0f1710] border-l-2 border-l-amber-400 dark:border-l-[#b7ff00]"
                : "bg-white dark:bg-[#071018] hover:bg-gray-50/80 dark:hover:bg-[#0d1823]"
            }`}
            style={{ height: totalRowHeight, width: "100%" }}
          >
            {/* Country label — sticky left, spans full height */}
            <div
              className={`sm:sticky left-0 z-20 px-2 flex items-center shrink-0 border-r border-black/[0.05] dark:border-[#1d2a36] ${
                brasil ? "bg-amber-50 dark:bg-[#0f1710]" : "bg-white dark:bg-[#071018] group-hover:bg-gray-50/80 dark:group-hover:bg-[#0d1823]"
              }`}
              style={{ width: LABEL_WIDTH, height: totalRowHeight }}
            >
              <span
                className={`text-[12px] font-bold truncate transition-colors leading-tight ${
                  brasil
                    ? "text-amber-700 dark:text-[#d8ff66]"
                    : "text-gray-500 dark:text-[#dce8e1] group-hover:text-gray-700 dark:group-hover:text-[#f2f7f4]"
                }`}
              >
                {row.country}
              </span>
            </div>

            {/* Lane dividers (subtle) */}
            {totalLanes > 1 && Array.from({ length: totalLanes - 1 }).map((_, li) => (
              <div
                key={li}
                className="absolute pointer-events-none"
                style={{
                  left: LABEL_WIDTH,
                  right: 0,
                  top: rowHeight * (li + 1),
                  height: 1,
                  backgroundColor: "rgba(139,159,181,0.12)",
                }}
              />
            ))}

            {/* Event markers — only render events in the visible viewport */}
            <div className="absolute inset-0 overflow-hidden" style={{ left: LABEL_WIDTH }}>
              {row.events.map((event, ei) => {
                const startPx = scale.toPixel(event.start_date);
                const endPx = event.end_date ? scale.toPixel(event.end_date) : startPx;
                if (endPx + LABEL_AFTER_BAR < visStart || startPx - POINT_HALF > visEnd) return null;
                return (
                  <EventMarker
                    key={event.id}
                    event={event}
                    scale={scale}
                    rowHeight={totalRowHeight}
                    lane={lanes[ei]}
                    totalLanes={totalLanes}
                    onClick={onEventClick}
                    onTypeFilter={onTypeFilter}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
