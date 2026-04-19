"use client";

import { RefObject, useCallback, useMemo, useRef, useState, WheelEvent } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { useTimelineSync } from "@/context/TimelineSyncContext";
import { MIN_PX_PER_DAY, MAX_PX_PER_DAY, DEFAULT_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { TimelineRows, LABEL_WIDTH } from "./TimelineRows";
import { GuideOverlay } from "./GuideOverlay";
import { EventLinesOverlay } from "./EventLinesOverlay";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { getYear } from "date-fns";

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  onEventClick: (e: OilEvent) => void;
  onTypeFilter: (type: EventType) => void;
}

export function Timeline({ events, scale, scrollRef, onScroll, onEventClick, onTypeFilter }: Props) {
  const { setPxPerDay, pxPerDay } = useTimelineSync();
  const yearAxisRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.88 : 1.14;
      setPxPerDay(clamp(pxPerDay * factor, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
    },
    [pxPerDay, setPxPerDay]
  );

  const handleScroll = useCallback(() => {
    if (scrollRef.current && yearAxisRef.current) {
      yearAxisRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
    onScroll();
  }, [onScroll, scrollRef]);

  const zoomIn = useCallback(() => setPxPerDay(clamp(pxPerDay * 1.4, MIN_PX_PER_DAY, MAX_PX_PER_DAY)), [pxPerDay, setPxPerDay]);
  const zoomOut = useCallback(() => setPxPerDay(clamp(pxPerDay / 1.4, MIN_PX_PER_DAY, MAX_PX_PER_DAY)), [pxPerDay, setPxPerDay]);
  const zoomReset = useCallback(() => setPxPerDay(DEFAULT_PX_PER_DAY), [setPxPerDay]);

  const zoomFit = useCallback(() => {
    const containerWidth = scrollRef.current?.clientWidth ?? 800;
    const fitPxPerDay = pxPerDay * containerWidth / scale.totalWidthPx;
    setPxPerDay(clamp(fitPxPerDay, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
  }, [pxPerDay, scale, scrollRef, setPxPerDay]);

  const zoomPercent = Math.round((pxPerDay / DEFAULT_PX_PER_DAY) * 100);

  const yearTicks = useMemo(() => {
    const ticks: { year: number; x: number }[] = [];
    const startYear = getYear(scale.domainStart);
    const endYear = getYear(scale.domainEnd);
    const MIN_SPACING = 28;
    let lastX = -Infinity;
    for (let y = startYear; y <= endYear; y++) {
      const x = scale.toPixel(new Date(y, 0, 1)) + LABEL_WIDTH;
      if (x - lastX >= MIN_SPACING) {
        ticks.push({ year: y, x });
        lastX = x;
      }
    }
    return ticks;
  }, [scale]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Zoom controls bar */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-black/[0.06] bg-[#f5f3ee]">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mr-1">Zoom</span>
        <button
          onClick={zoomOut}
          disabled={pxPerDay <= MIN_PX_PER_DAY}
          className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-gray-600 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Reduzir zoom"
        >
          −
        </button>
        <button
          onClick={zoomReset}
          className="px-2 h-6 text-[10px] font-mono text-gray-500 hover:bg-black/10 rounded transition-colors min-w-[42px] text-center"
          title="Resetar zoom"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={zoomIn}
          disabled={pxPerDay >= MAX_PX_PER_DAY}
          className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-gray-600 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Aumentar zoom"
        >
          +
        </button>
        <button
          onClick={zoomFit}
          className="ml-1 px-2 h-6 text-[10px] text-gray-500 hover:bg-black/10 rounded transition-colors"
          title="Ajustar toda a timeline à tela"
        >
          Fit
        </button>
        <span className="text-[9px] text-gray-300 ml-2 hidden sm:block">Ctrl+Scroll também funciona</span>

        <div className="ml-auto relative">
          <button
            ref={settingsBtnRef}
            onClick={() => setSettingsOpen((o) => !o)}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              settingsOpen ? "bg-amber-100 text-amber-700" : "text-gray-500 hover:bg-black/10"
            }`}
            title="Configurações"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            anchorRef={settingsBtnRef}
          />
        </div>
      </div>

      {/* Year axis — fixed header, synced via JS scroll */}
      <div
        ref={yearAxisRef}
        className="shrink-0 overflow-x-hidden overflow-y-hidden bg-[#f5f3ee] border-b border-black/[0.06]"
        style={{ height: 28 }}
      >
        <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, minWidth: scale.totalWidthPx + LABEL_WIDTH, position: "relative", height: 28 }}>
          {yearTicks.map(({ year, x }) => (
            <div
              key={year}
              className="absolute top-0 bottom-0 flex flex-col items-start"
              style={{ left: x }}
            >
              <div className="w-px h-full bg-black/[0.07]" />
              <span className="absolute top-1 left-1 text-[10px] text-gray-400 font-mono whitespace-nowrap">
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="timeline-scroll flex-1 overflow-x-auto overflow-y-auto relative min-h-0 bg-white"
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, minWidth: scale.totalWidthPx + LABEL_WIDTH, position: "relative" }}>
          <EventLinesOverlay events={events} scale={scale} />
          <TimelineRows events={events} scale={scale} onEventClick={onEventClick} onTypeFilter={onTypeFilter} />
          <GuideOverlay scale={scale} />
        </div>

        {/* Footer — visible only when scrolled to the bottom */}
        <footer
          className="border-t border-black/[0.07] bg-[#f5f3ee] px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
          style={{ position: "sticky", left: 0, width: "100vw" }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-400 font-semibold tracking-wide">
              Desenvolvido por{" "}
              <span className="text-gray-600 font-bold">Diogo S. P. Calegari</span>
            </span>
            <span className="hidden sm:inline text-gray-300">·</span>
            <a
              href="mailto:timelinedopetroleo@gmail.com"
              className="hidden sm:inline text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
            >
              timelinedopetroleo@gmail.com
            </a>
          </div>
          <p className="text-[9.5px] text-gray-400 leading-relaxed sm:border-l sm:border-black/[0.08] sm:pl-4">
            Projeto pessoal e independente. Informações baseadas em fontes públicas e literatura especializada —
            podem conter imprecisões de cunho didático. O autor não se responsabiliza pelo uso das informações aqui apresentadas.
          </p>
        </footer>
      </div>
    </div>
  );
}
