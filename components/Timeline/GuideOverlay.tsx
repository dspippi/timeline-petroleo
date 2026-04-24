"use client";

import { memo } from "react";
import { TimelineScale } from "@/types";
import { useHoveredDate } from "@/context/TimelineSyncContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABEL_WIDTH } from "./TimelineRows";

interface Props {
  scale: TimelineScale;
}

export const GuideOverlay = memo(function GuideOverlay({ scale }: Props) {
  const hoveredDate = useHoveredDate();
  if (!hoveredDate) return null;

  const x = scale.toPixel(hoveredDate) + LABEL_WIDTH;
  const label = format(hoveredDate, "MMM yyyy", { locale: ptBR });

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30"
      style={{ left: x, width: 1 }}
    >
      <div className="w-px h-full bg-brand/45 dark:shadow-brand-glow" />
      <div className="absolute top-6 left-2 text-[10px] text-content-secondary bg-surface px-1.5 py-0.5 rounded border border-brand/30 shadow-sm dark:shadow-brand-glow whitespace-nowrap font-mono">
        {label}
      </div>
    </div>
  );
});
