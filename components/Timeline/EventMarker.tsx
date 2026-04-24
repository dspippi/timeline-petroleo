"use client";

import { memo, useCallback, useRef, useState } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { useSetHoveredDate } from "@/context/TimelineSyncContext";
import { useDarkMode, useSettings } from "@/context/SettingsContext";
import { useCategories } from "@/context/CategoriesContext";
import { HoverTooltip } from "./HoverTooltip";

interface Props {
  event: OilEvent;
  scale: TimelineScale;
  rowHeight: number;
  lane: number;
  totalLanes: number;
  onClick: (e: OilEvent) => void;
  onTypeFilter: (type: EventType) => void;
}

const LABEL_MAX_WIDTH = 120;
const LABEL_FONT_SIZE = 10;

export const EventMarker = memo(function EventMarker({
  event,
  scale,
  rowHeight,
  lane,
  totalLanes,
  onClick,
  onTypeFilter,
}: Props) {
  const setHoveredDate = useSetHoveredDate();
  const { settings } = useSettings();
  const darkMode = useDarkMode();
  const { getColor, getShape } = useCategories();
  const color = getColor(event.type);
  const shape = getShape(event.type);
  const x = scale.toPixel(event.start_date);
  const isInterval = !!event.end_date;
  const barWidth = isInterval ? scale.toPixel(event.end_date!) - x : 0;

  const [isHovered, setIsHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showTooltip = useCallback((e: React.MouseEvent) => {
    clearTimeout(hideTimer.current);
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setTooltipVisible(true);
    setIsHovered(true);
    setHoveredDate(event.start_date);
  }, [event.start_date, setHoveredDate]);

  const updatePos = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => {
      setTooltipVisible(false);
      setIsHovered(false);
      setHoveredDate(null);
    }, 120);
  }, [setHoveredDate]);

  const cancelHide = useCallback(() => {
    clearTimeout(hideTimer.current);
  }, []);

  const laneH = rowHeight / totalLanes;

  // ── Interval event ───────────────────────────────────────────────────────────
  if (isInterval) {
    const w = Math.max(barWidth, 6);
    const showInlineLabel = w > 60;
    const barTop = laneH * lane + laneH * 0.2;
    const barHeight = laneH * 0.6;

    return (
      <>
        <div
          className="absolute cursor-pointer"
          style={{ left: x, top: barTop, height: barHeight, width: w }}
          onMouseEnter={showTooltip}
          onMouseLeave={scheduleHide}
          onMouseMove={updatePos}
          onClick={() => onClick(event)}
        >
          <div
            className="absolute rounded-sm transition-all"
            style={{
              top: 0,
              height: barHeight,
              left: 0,
              right: 0,
              backgroundColor: color,
              border: `1px solid ${color}`,
              boxShadow: isHovered ? `0 0 10px ${color}, 0 0 18px ${color}55` : darkMode ? `0 0 8px ${color}44` : undefined,
            }}
          />

          {showInlineLabel && (
            <div
              className="absolute flex items-center overflow-hidden pointer-events-none"
              style={{ top: 0, height: barHeight, left: 5, right: 5 }}
            >
              <span
                className="leading-tight"
                style={{
                  fontSize: LABEL_FONT_SIZE,
                  fontWeight: 600,
                  color: "#fff",
                  maxWidth: w - 10,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
                  overflow: "hidden",
                  padding: "1px 3px",
                }}
              >
                {event.title}
              </span>
            </div>
          )}

          {!showInlineLabel && (
            <div
              className="absolute pointer-events-none flex items-center"
              style={{ left: w + 4, top: 0, height: barHeight, width: LABEL_MAX_WIDTH }}
            >
              <span
                className="leading-tight"
                style={{
                  fontSize: LABEL_FONT_SIZE,
                  fontWeight: 600,
                  color,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
                  overflow: "hidden",
                  backgroundColor: darkMode ? "rgba(7,16,24,0.82)" : "rgba(255,255,255,0.82)",
                  backdropFilter: "blur(2px)",
                  border: darkMode ? "1px solid rgba(139,159,181,0.12)" : undefined,
                  borderRadius: 3,
                  padding: "1px 3px",
                }}
              >
                {event.title}
              </span>
            </div>
          )}
        </div>

        {tooltipVisible && (
          <HoverTooltip
            event={event}
            x={tooltipPos.x}
            y={tooltipPos.y}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            onTypeClick={onTypeFilter}
          />
        )}
      </>
    );
  }

  // ── Point event (diamond pin) ────────────────────────────────────────────────
  const getShapePath = (s: string) => {
    switch (s) {
      case "triangle":
        return "M12 2L22 20H2Z";
      case "circle":
        return "M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z";
      case "square":
        return "M4 4h16v16H4z";
      case "star":
        return "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z";
      case "hexagon":
        return "M12 2L20.66 7L20.66 17L12 22L3.34 17L3.34 7Z";
      case "diamond":
      default:
        return "M12 2L22 12L12 22L2 12Z";
    }
  };

  const base = settings.markerSize * 1.35; // Compensate for SVG bounding box vs old rotated div
  const pinSize = isHovered ? Math.round(base * 1.2) : base;
  const pinTop = laneH * lane + laneH * 0.2 - pinSize / 2;
  const labelTop = laneH * lane + laneH * 0.2 + pinSize / 2 + 4;

  const hitPad = 10;
  const hitLeft = x - pinSize / 2 - hitPad;
  const hitWidth = pinSize + hitPad * 2;
  const hitTop = pinTop - hitPad;
  const hitHeight = pinSize + hitPad * 2;

  return (
    <>
      <div
        className="absolute cursor-pointer flex items-center justify-center"
        style={{ left: hitLeft, top: hitTop, width: hitWidth, height: hitHeight, zIndex: 10 }}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHide}
        onMouseMove={updatePos}
        onClick={() => onClick(event)}
      >
        <svg
          width={pinSize}
          height={pinSize}
          viewBox="0 0 24 24"
          className="transition-all"
          style={{
            fill: color,
            filter: isHovered ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 12px ${color}66)` : `drop-shadow(0 0 4px ${color}99)`,
          }}
        >
          <path d={getShapePath(shape)} />
        </svg>
      </div>

      {settings.showEventLabels && (
        <div
          className="absolute pointer-events-none"
          style={{ left: x - LABEL_MAX_WIDTH / 2, width: LABEL_MAX_WIDTH, top: labelTop, zIndex: 2 }}
        >
          <p
            className="text-center leading-tight mx-auto"
            style={{
              fontSize: LABEL_FONT_SIZE,
              fontWeight: 600,
              color: isHovered ? color : darkMode ? "#dce8e1" : "#4b5563",
              lineHeight: "1.25",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
              overflow: "hidden",
              backgroundColor: darkMode ? "rgba(7,16,24,0.82)" : "rgba(255,255,255,0.82)",
              backdropFilter: "blur(2px)",
              border: darkMode ? "1px solid rgba(139,159,181,0.12)" : undefined,
              boxShadow: darkMode ? "0 3px 12px rgba(0,0,0,0.24)" : undefined,
              borderRadius: 3,
              padding: "1px 3px",
            }}
          >
            {event.title}
          </p>
        </div>
      )}

      {tooltipVisible && (
        <HoverTooltip
          event={event}
          x={tooltipPos.x}
          y={tooltipPos.y}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          onTypeClick={onTypeFilter}
        />
      )}
    </>
  );
});
