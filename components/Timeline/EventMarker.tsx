"use client";

import { memo, useCallback, useRef, useState } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { EVENT_TYPE_COLORS } from "@/lib/colorMap";
import { useTimelineSync } from "@/context/TimelineSyncContext";
import { useSettings } from "@/context/SettingsContext";
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
const LABEL_FONT_SIZE = 11;

export const EventMarker = memo(function EventMarker({
  event,
  scale,
  rowHeight,
  lane,
  totalLanes,
  onClick,
  onTypeFilter,
}: Props) {
  const { setHoveredDate, hoveredDate } = useTimelineSync();
  const { settings } = useSettings();
  const color = EVENT_TYPE_COLORS[event.type];
  const x = scale.toPixel(event.start_date);
  const isInterval = !!event.end_date;
  const barWidth = isInterval ? scale.toPixel(event.end_date!) - x : 0;

  const isHovered =
    hoveredDate !== null &&
    Math.abs(hoveredDate.getTime() - event.start_date.getTime()) < 15 * 86_400_000;

  // Tooltip hover state with grace-period delay so user can move mouse into the tooltip
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showTooltip = useCallback((clientX: number, clientY: number) => {
    clearTimeout(leaveTimerRef.current);
    setTooltipPos({ x: clientX, y: clientY });
    setTooltipVisible(true);
  }, []);

  const startHideTooltip = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setTooltipVisible(false), 180);
  }, []);

  const cancelHideTooltip = useCallback(() => {
    clearTimeout(leaveTimerRef.current);
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      showTooltip(e.clientX, e.clientY);
      setHoveredDate(event.start_date);
    },
    [event.start_date, setHoveredDate, showTooltip]
  );

  const handleMouseLeave = useCallback(() => {
    startHideTooltip();
    setHoveredDate(null);
  }, [setHoveredDate, startHideTooltip]);

  const laneH = rowHeight / totalLanes;

  // ── Interval event ───────────────────────────────────────────────────────────
  if (isInterval) {
    const w = Math.max(barWidth, 6);
    const showInlineLabel = w > 60;
    const barTop = laneH * lane + laneH * 0.25;
    const barHeight = laneH * 0.5;

    return (
      <div
        className="absolute cursor-pointer"
        style={{ left: x, top: 0, bottom: 0, width: w }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick(event)}
      >
        {/* Bar */}
        <div
          className="absolute rounded-sm transition-all"
          style={{
            top: barTop,
            height: barHeight,
            left: 0,
            right: 0,
            backgroundColor: color + (isHovered ? "44" : "28"),
            border: `1px solid ${color}${isHovered ? "cc" : "66"}`,
            boxShadow: isHovered ? `0 0 6px ${color}44` : undefined,
          }}
        />

        {/* Inline label when bar is wide enough */}
        {showInlineLabel && (
          <div
            className="absolute flex items-center overflow-hidden pointer-events-none"
            style={{ top: barTop, height: barHeight, left: 5, right: 5 }}
          >
            <span
              className="leading-tight"
              style={{
                fontSize: LABEL_FONT_SIZE,
                fontWeight: 600,
                color: color,
                maxWidth: w - 10,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
                overflow: "hidden",
              }}
            >
              {event.title}
            </span>
          </div>
        )}

        {/* Short label — after the bar, vertically centered */}
        {!showInlineLabel && (
          <div
            className="absolute pointer-events-none flex items-center"
            style={{ left: w + 4, top: barTop, height: barHeight, width: LABEL_MAX_WIDTH }}
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
                backgroundColor: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(2px)",
                borderRadius: 3,
                padding: "1px 3px",
              }}
            >
              {event.title}
            </span>
          </div>
        )}

        {tooltipVisible && (
          <HoverTooltip
            event={event}
            x={tooltipPos.x}
            y={tooltipPos.y}
            onMouseEnter={cancelHideTooltip}
            onMouseLeave={startHideTooltip}
            onTypeClick={onTypeFilter}
          />
        )}
      </div>
    );
  }

  // ── Point event (diamond pin) ────────────────────────────────────────────────
  const base = settings.markerSize;
  const pinSize = isHovered ? Math.round(base * 1.2) : base;
  const pinTop = laneH * lane + laneH * 0.3 - pinSize / 2;
  const labelTop = laneH * lane + laneH * 0.3 + pinSize / 2 + 4;

  // Tight hitbox — only the diamond + small padding, not the full label width
  const hitPad = 10;
  const hitLeft = x - pinSize / 2 - hitPad;
  const hitWidth = pinSize + hitPad * 2;
  const hitTop = pinTop - hitPad;
  const hitHeight = pinSize + hitPad * 2;

  return (
    <>
      {/* Hover / click hitbox — tight around diamond only */}
      <div
        className="absolute cursor-pointer"
        style={{ left: hitLeft, top: hitTop, width: hitWidth, height: hitHeight, zIndex: 10 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick(event)}
      >
        {/* Diamond — positioned relative to the hitbox */}
        <div
          className="absolute transition-all"
          style={{
            left: hitPad,
            top: hitPad,
            width: pinSize,
            height: pinSize,
            transform: "rotate(45deg)",
            backgroundColor: color,
            boxShadow: isHovered ? `0 0 10px ${color}` : `0 0 4px ${color}88`,
          }}
        />

        {tooltipVisible && (
          <HoverTooltip
            event={event}
            x={tooltipPos.x}
            y={tooltipPos.y}
            onMouseEnter={cancelHideTooltip}
            onMouseLeave={startHideTooltip}
            onTypeClick={onTypeFilter}
          />
        )}
      </div>

      {/* Label — pointer-events-none, positioned independently, above event lines */}
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
              color: isHovered ? color : "#4b5563",
              lineHeight: "1.25",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
              overflow: "hidden",
              backgroundColor: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(2px)",
              borderRadius: 3,
              padding: "1px 3px",
            }}
          >
            {event.title}
          </p>
        </div>
      )}
    </>
  );
});
