"use client";

import { memo } from "react";
import { OilEvent, TimelineScale } from "@/types";
import { EVENT_TYPE_COLORS } from "@/lib/colorMap";
import { LABEL_WIDTH } from "./TimelineRows";

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
}

export const EventLinesOverlay = memo(function EventLinesOverlay({ events, scale }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {events.map((event) => {
        const x = scale.toPixel(event.start_date) + LABEL_WIDTH;
        const color = EVENT_TYPE_COLORS[event.type];
        return (
          <div
            key={event.id}
            className="absolute top-0 bottom-0"
            style={{
              left: x,
              width: 1,
              background: color + "40", // ~25% opacity
            }}
          />
        );
      })}
    </div>
  );
});
