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
      <div className="w-px h-full bg-gray-400/50 dark:bg-[#b7ff00]/45 dark:shadow-[0_0_12px_rgba(183,255,0,0.28)]" />
      <div className="absolute top-6 left-2 text-[10px] text-gray-600 dark:text-[#dce8e1] bg-white dark:bg-[#071018] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#b7ff00]/30 shadow-sm dark:shadow-[0_0_14px_rgba(183,255,0,0.14)] whitespace-nowrap font-mono">
        {label}
      </div>
    </div>
  );
});
