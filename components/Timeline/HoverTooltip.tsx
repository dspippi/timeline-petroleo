"use client";

import { OilEvent, EventType } from "@/types";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/lib/colorMap";

interface Props {
  event: OilEvent;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTypeClick: (type: EventType) => void;
}

export function HoverTooltip({ event, x, y, onMouseEnter, onMouseLeave, onTypeClick }: Props) {
  const color = EVENT_TYPE_COLORS[event.type];
  const typeLabel = EVENT_TYPE_LABELS[event.type];
  const startYear = event.start_date.getFullYear();
  const endYear = event.end_date ? ` — ${event.end_date.getFullYear()}` : "";

  return (
    <div
      className="fixed z-[200]"
      style={{ left: x, top: y - 10, transform: "translate(-50%, -100%)" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="bg-white rounded-xl border border-black/10 shadow-xl p-3 text-left"
        style={{ width: 260 }}
      >
        {/* Year */}
        <div className="text-[11px] font-mono text-gray-400 mb-1.5 leading-none">
          {startYear}{endYear}
        </div>

        {/* Type badge — clickable to filter */}
        <button
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 hover:opacity-75 transition-opacity cursor-pointer"
          style={{ backgroundColor: color + "22", color }}
          onClick={(e) => {
            e.stopPropagation();
            onTypeClick(event.type);
          }}
        >
          {typeLabel}
        </button>

        {/* Title */}
        <div className="font-bold text-[13px] text-gray-800 leading-snug mb-1.5">
          {event.title}
        </div>

        {/* Description */}
        {event.description && (
          <div
            className="text-[11px] leading-relaxed overflow-hidden"
            style={{
              color: color,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            }}
          >
            {event.description}
          </div>
        )}
      </div>

      {/* Caret pointing down */}
      <div
        className="mx-auto -mt-px"
        style={{
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "7px solid white",
          filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.06))",
        }}
      />
    </div>
  );
}
