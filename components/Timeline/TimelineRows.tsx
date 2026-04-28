"use client";

import { useMemo } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { groupEventsByRegion, isBrasil } from "@/lib/utils";
import { EventMarker } from "./EventMarker";
import { useSettings, DEFAULT_SETTINGS } from "@/context/SettingsContext";

/** @deprecated Use settings.rowHeight from useSettings() instead */
export const ROW_HEIGHT = DEFAULT_SETTINGS.rowHeight;
const REGION_HEADER_MIN_HEIGHT = 22;
export const LABEL_WIDTH = 112;

// Horizontal footprint constants used for lane assignment.
const INTERVAL_GAP = 6;
const POINT_HALF = 65;
const LABEL_AFTER_BAR = 124;


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
      <div className="flex items-center justify-center h-32 text-content-muted text-sm">
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
              className="relative flex items-stretch border-y border-line bg-app"
              style={{ minHeight: REGION_HEADER_MIN_HEIGHT, width: "100%" }}
            >
              <div
                className="absolute bottom-0 top-0 w-px bg-line"
                style={{ left: LABEL_WIDTH - 1 }}
              />
              <div
                className="sm:sticky left-0 z-10 bg-app px-2 py-1 flex items-center"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="text-[9px] font-bold text-content-tertiary uppercase tracking-[0.08em] leading-tight break-words">
                  {row.region}
                </span>
              </div>
              <div className="flex-1 h-px bg-line" />
            </div>
          );
        }

        const brasil = isBrasil(row.country);
        const { lanes, totalLanes } = assignLanes(row.events, scale);
        const totalRowHeight = rowHeight * totalLanes;

        return (
          <div
            key={`country-${row.country}-${i}`}
            className={`relative flex items-stretch border-b border-line group ${
              brasil
                ? "bg-brand-bg border-l-2 border-l-brand"
                : "bg-surface hover:bg-surface-hover"
            }`}
            style={{ height: totalRowHeight, width: "100%" }}
          >
            {/* Country label — sticky left, spans full height */}
            <div
              className={`sm:sticky left-0 z-20 px-2 flex items-center shrink-0 border-r border-line ${
                brasil ? "bg-brand-bg" : "bg-surface group-hover:bg-surface-hover"
              }`}
              style={{ width: LABEL_WIDTH, height: totalRowHeight }}
            >
              <span
                className={`text-[12px] font-bold truncate transition-colors leading-tight ${
                  brasil
                    ? "text-brand-hover"
                    : "text-content-secondary group-hover:text-content-primary"
                }`}
              >
                {row.country}
              </span>
            </div>

            {/* Lane dividers removidos para um design mais limpo */}

            {/* Event markers — only render events in the visible viewport */}
            <div className="absolute inset-0 overflow-hidden" style={{ left: LABEL_WIDTH }}>
              {row.events.map((event, ei) => {
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
