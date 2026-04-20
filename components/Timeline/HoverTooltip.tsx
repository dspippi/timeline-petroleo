"use client";

import { OilEvent, EventType } from "@/types";
import { useCategories } from "@/context/CategoriesContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  event: OilEvent;
  x: number;
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTypeClick: (type: EventType) => void;
}

export function HoverTooltip({ event, x, y, onMouseEnter, onMouseLeave, onTypeClick }: Props) {
  const { getColor, getLabel } = useCategories();
  const color = getColor(event.type);
  const typeLabel = getLabel(event.type);

  const dateLabel = event.end_date
    ? `${format(event.start_date, "yyyy", { locale: ptBR })} – ${format(event.end_date, "yyyy", { locale: ptBR })}`
    : format(event.start_date, "MMM yyyy", { locale: ptBR });

  // Fit tooltip horizontally inside the viewport
  const tipWidth = 268;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const left = Math.min(Math.max(x - tipWidth / 2, 8), vw - tipWidth - 8);
  const caretOffset = x - left; // caret tracks the real cursor X

  return (
    <div
      className="fixed pointer-events-auto"
      style={{ left, top: y - 12, transform: "translateY(-100%)", zIndex: 9999 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Card */}
      <div
        className="rounded-xl shadow-2xl overflow-hidden text-left"
        style={{
          width: tipWidth,
          background: "white",
          border: `1px solid ${color}33`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px ${color}18`,
        }}
      >
        {/* Colored top accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

        <div className="p-3">
          {/* Type badge + date */}
          <div className="flex items-center justify-between mb-2">
            <button
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider hover:opacity-75 transition-opacity"
              style={{ backgroundColor: color + "1a", color }}
              onClick={(e) => { e.stopPropagation(); onTypeClick(event.type); }}
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 6, height: 6, background: color, flexShrink: 0 }}
              />
              {typeLabel}
            </button>
            <span className="text-[11px] font-mono" style={{ color: color + "bb" }}>
              {dateLabel}
            </span>
          </div>

          {/* Title */}
          <div className="font-bold leading-snug mb-2" style={{ fontSize: 13, color: "#1a1a2e" }}>
            {event.title}
          </div>

          {/* Description */}
          {event.description && (
            <div
              className="text-[11px] leading-relaxed"
              style={{
                color: "#6b7280",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
                overflow: "hidden",
              }}
            >
              {event.description}
            </div>
          )}

          {/* Country / company footer */}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t" style={{ borderColor: color + "22" }}>
            <span className="text-[10px] font-semibold" style={{ color: color }}>
              {event.country}
            </span>
            {event.company && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-[10px] text-gray-400">{event.company}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caret — tracks cursor within card */}
      <div
        style={{
          position: "absolute",
          bottom: -7,
          left: caretOffset,
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: `7px solid ${color}33`,
          filter: "drop-shadow(0 2px 1px rgba(0,0,0,0.06))",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: caretOffset,
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid white",
        }}
      />
    </div>
  );
}
