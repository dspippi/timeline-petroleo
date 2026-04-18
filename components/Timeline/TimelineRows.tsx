"use client";

import { useMemo } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { groupEventsByRegion, isBrasil } from "@/lib/utils";
import { EventMarker } from "./EventMarker";
import { useSettings } from "@/context/SettingsContext";

export const ROW_HEIGHT = 72; // default; runtime value comes from settings
const REGION_HEADER_HEIGHT = 22;
export const LABEL_WIDTH = 112;

// How wide (in px) each event "claims" horizontally to detect overlap
const POINT_HALF = 65;      // half label width for point events
const INTERVAL_GAP = 6;     // buffer for interval events
const LABEL_AFTER_BAR = 124; // label width + gap for short intervals (must match EventMarker)

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
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

export function TimelineRows({ events, scale, onEventClick, onTypeFilter }: Props) {
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

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
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
              className="flex items-center border-b border-black/[0.04] bg-[#f5f3ee]"
              style={{ height: REGION_HEADER_HEIGHT, width: "100%" }}
            >
              <div
                className="sticky left-0 z-10 bg-[#f5f3ee] px-2 flex items-center"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  {row.region}
                </span>
              </div>
              <div className="flex-1 h-px bg-black/[0.05]" />
            </div>
          );
        }

        const brasil = isBrasil(row.country);
        const { lanes, totalLanes } = assignLanes(row.events, scale);
        const totalRowHeight = rowHeight * totalLanes;

        return (
          <div
            key={`country-${row.country}-${i}`}
            className={`relative flex items-stretch border-b border-black/[0.04] group ${
              brasil
                ? "bg-amber-50 border-l-2 border-l-amber-400"
                : "bg-white hover:bg-gray-50/80"
            }`}
            style={{ height: totalRowHeight, width: "100%" }}
          >
            {/* Country label — sticky left, spans full height */}
            <div
              className={`sticky left-0 z-10 px-2 flex items-center shrink-0 border-r border-black/[0.05] ${
                brasil ? "bg-amber-50" : "bg-white group-hover:bg-gray-50/80"
              }`}
              style={{ width: LABEL_WIDTH, height: totalRowHeight }}
            >
              <span
                className={`text-[11px] font-semibold truncate transition-colors leading-tight ${
                  brasil
                    ? "text-amber-700"
                    : "text-gray-500 group-hover:text-gray-700"
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
                  backgroundColor: "rgba(0,0,0,0.03)",
                }}
              />
            ))}

            {/* Event markers */}
            <div className="absolute inset-0" style={{ left: LABEL_WIDTH }}>
              {row.events.map((event, ei) => (
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
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
