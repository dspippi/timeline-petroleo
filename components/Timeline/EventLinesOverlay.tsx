"use client";

import { memo } from "react";
import { OilEvent, TimelineScale } from "@/types";
import { useCategories } from "@/context/CategoriesContext";
import { LABEL_WIDTH } from "./TimelineRows";

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
}

// Single SVG with one <line> per event instead of one <div> per event.
// Drastically reduces the browser's layout work during scroll and repaint.
export const EventLinesOverlay = memo(function EventLinesOverlay({ events, scale }: Props) {
  const { getColor } = useCategories();
  const totalWidth = scale.totalWidthPx + LABEL_WIDTH;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1, width: totalWidth, height: "100%" }}
      preserveAspectRatio="none"
    >
      {events.map((event) => {
        const x = scale.toPixel(event.start_date) + LABEL_WIDTH;
        return (
          <line
            key={event.id}
            x1={x} y1="0"
            x2={x} y2="100%"
            stroke={getColor(event.type)}
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
});
