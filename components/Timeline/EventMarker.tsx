"use client";

import { memo, useCallback, useRef, useState } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { useSetHoveredDate } from "@/context/TimelineSyncContext";
import { useSettings } from "@/context/SettingsContext";
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
  const { getColor } = useCategories();
  const color = getColor(event.type);
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
    const barTop = laneH * lane + laneH * 0.25;
    const barHeight = laneH * 0.5;

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
              boxShadow: isHovered ? `0 0 6px ${color}` : undefined,
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
  const base = settings.markerSize;
  const pinSize = isHovered ? Math.round(base * 1.2) : base;
  const pinTop = laneH * lane + laneH * 0.3 - pinSize / 2;
  const labelTop = laneH * lane + laneH * 0.3 + pinSize / 2 + 4;

  const hitPad = 10;
  const hitLeft = x - pinSize / 2 - hitPad;
  const hitWidth = pinSize + hitPad * 2;
  const hitTop = pinTop - hitPad;
  const hitHeight = pinSize + hitPad * 2;

  return (
    <>
      <div
        className="absolute cursor-pointer"
        style={{ left: hitLeft, top: hitTop, width: hitWidth, height: hitHeight, zIndex: 10 }}
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHide}
        onMouseMove={updatePos}
        onClick={() => onClick(event)}
      >
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
