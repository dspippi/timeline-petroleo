"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { usePxPerDay, useSetPxPerDay, useSetHoveredDate } from "@/context/TimelineSyncContext";
import { MIN_PX_PER_DAY, MAX_PX_PER_DAY, DEFAULT_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { TimelineRows, LABEL_WIDTH } from "./TimelineRows";
import { GuideOverlay } from "./GuideOverlay";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { getYear } from "date-fns";
import pkg from "@/package.json";

interface Props {
  events: OilEvent[];
  scale: TimelineScale;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  onEventClick: (e: OilEvent) => void;
  onTypeFilter: (type: EventType) => void;
}

export function Timeline({ events, scale, scrollRef, onScroll, onEventClick, onTypeFilter }: Props) {
  const pxPerDay       = usePxPerDay();
  const setPxPerDay    = useSetPxPerDay();
  const setHoveredDate = useSetHoveredDate();
  const yearAxisRef    = useRef<HTMLDivElement>(null);
  // rAF handle for throttling hover date updates to one per frame
  const hoverRafRef = useRef<number | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag-to-pan state
  const dragState = useRef<{ startX: number; startY: number; startScrollLeft: number; startScrollTop: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only left button; ignore clicks on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [data-nodrag]")) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, startScrollLeft: scrollRef.current?.scrollLeft ?? 0, startScrollTop: scrollRef.current?.scrollTop ?? 0, moved: false };
    setIsDragging(true);
    e.preventDefault();
  }, [scrollRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Drag-to-pan — direct DOM manipulation, no React state, runs every frame
    if (dragState.current && scrollRef.current) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.current.moved = true;
      scrollRef.current.scrollLeft = dragState.current.startScrollLeft - dx;
      scrollRef.current.scrollTop  = dragState.current.startScrollTop  - dy;
      if (yearAxisRef.current) yearAxisRef.current.scrollLeft = scrollRef.current.scrollLeft;
      onScroll();
    }
    // Hover → date for price chart — throttled to one rAF per frame
    if (scrollRef.current && hoverRafRef.current === null) {
      const clientX = e.clientX;
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        const el = scrollRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const plotX = clientX - rect.left + el.scrollLeft - LABEL_WIDTH;
        if (plotX >= 0) setHoveredDate(scale.toDate(plotX));
      });
    }
  }, [scrollRef, onScroll, scale, setHoveredDate]);

  const handleMouseLeave = useCallback(() => {
    dragState.current = null;
    setIsDragging(false);
    setHoveredDate(null);
  }, [setHoveredDate]);

  const handleMouseUp = useCallback(() => {
    dragState.current = null;
    setIsDragging(false);
  }, []);

  // Wrap onEventClick to suppress it when drag occurred
  const handleEventClick = useCallback((e: OilEvent) => {
    if (dragState.current?.moved) return;
    onEventClick(e);
  }, [onEventClick]);

  // Register wheel as non-passive so preventDefault() blocks scroll.
  // Accumulate delta per-frame via RAF for smooth, high-FPS zoom.
  const pxPerDayRef = useRef(pxPerDay);
  pxPerDayRef.current = pxPerDay;
  const pendingDelta = useRef(0);
  const rafId = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      pendingDelta.current += e.deltaY;
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const delta = pendingDelta.current;
        pendingDelta.current = 0;
        const factor = Math.pow(0.88, delta / 100);
        setPxPerDay(clamp(pxPerDayRef.current * factor, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [scrollRef, setPxPerDay]);

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
    const plotWidth = containerWidth - LABEL_WIDTH;
    const fitPxPerDay = pxPerDay * plotWidth / scale.totalWidthPx;
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
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#f5f3ee] dark:bg-[#0d0e14]">
        <span className="text-[10px] text-gray-400 dark:text-[#3a3c50] uppercase tracking-wider font-medium mr-1">Zoom</span>
        <button
          onClick={zoomOut}
          disabled={pxPerDay <= MIN_PX_PER_DAY}
          className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-gray-600 dark:text-[#5a5c70] hover:bg-black/10 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Reduzir zoom"
        >
          −
        </button>
        <button
          onClick={zoomReset}
          className="px-2 h-6 text-[10px] font-mono text-gray-500 dark:text-[#5a5c70] hover:bg-black/10 dark:hover:bg-white/[0.08] rounded transition-colors min-w-[42px] text-center"
          title="Resetar zoom"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={zoomIn}
          disabled={pxPerDay >= MAX_PX_PER_DAY}
          className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-gray-600 dark:text-[#5a5c70] hover:bg-black/10 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Aumentar zoom"
        >
          +
        </button>
        <button
          onClick={zoomFit}
          className="ml-1 px-2 h-6 text-[10px] text-gray-500 dark:text-[#5a5c70] hover:bg-black/10 dark:hover:bg-white/[0.08] rounded transition-colors"
          title="Ajustar toda a timeline à tela"
        >
          Fit
        </button>
        <span className="text-[9px] text-gray-300 dark:text-[#2a2c40] ml-2 hidden sm:block">Ctrl+Scroll para zoom · Arraste para navegar</span>

        <div className="ml-auto relative">
          <button
            ref={settingsBtnRef}
            onClick={() => setSettingsOpen((o) => !o)}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              settingsOpen ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-[#5a5c70] hover:bg-black/10 dark:hover:bg-white/[0.08]"
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
        className="shrink-0 overflow-x-hidden overflow-y-hidden bg-[#f5f3ee] dark:bg-[#0d0e14] border-b border-black/[0.06] dark:border-white/[0.06]"
        style={{ height: 28 }}
      >
        <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, minWidth: scale.totalWidthPx + LABEL_WIDTH, position: "relative", height: 28 }}>
          {yearTicks.map(({ year, x }) => (
            <div
              key={year}
              className="absolute top-0 bottom-0 flex flex-col items-start"
              style={{ left: x }}
            >
              <div className="w-px h-full bg-black/[0.07] dark:bg-white/[0.06]" />
              <span className="absolute top-1 left-1 text-[10px] text-gray-400 dark:text-[#3a3c50] font-mono whitespace-nowrap">
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="timeline-scroll flex-1 overflow-x-auto overflow-y-auto relative min-h-0 bg-white dark:bg-[#0d0e14]"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, minWidth: scale.totalWidthPx + LABEL_WIDTH, position: "relative" }}>
<TimelineRows events={events} scale={scale} scrollRef={scrollRef} onEventClick={handleEventClick} onTypeFilter={onTypeFilter} />
          <GuideOverlay scale={scale} />
        </div>

        {/* Footer — visible only when scrolled to the bottom */}
        <footer
          className="border-t border-black/[0.07] dark:border-white/[0.06] bg-[#f5f3ee] dark:bg-[#0d0e14] px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
          style={{ position: "sticky", left: 0, width: "100vw" }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-400 dark:text-[#3a3c50] font-semibold tracking-wide">
              Desenvolvido por{" "}
              <span className="text-gray-600 dark:text-[#5a5c70] font-bold">Diogo S. P. Calegari</span>
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-[#2a2c40]">·</span>
            <a
              href="mailto:timelinedopetroleo@gmail.com"
              className="hidden sm:inline text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
            >
              timelinedopetroleo@gmail.com
            </a>
            <span className="hidden sm:inline text-gray-300 dark:text-[#2a2c40]">·</span>
            <span className="hidden sm:inline text-[10px] text-gray-400 dark:text-[#3a3c50] font-mono">v{pkg.version}</span>
          </div>
          <p className="text-[9.5px] text-gray-400 dark:text-[#3a3c50] leading-relaxed sm:border-l sm:border-black/[0.08] dark:sm:border-white/[0.06] sm:pl-4">
            Projeto pessoal e independente. Informações baseadas em fontes públicas e literatura especializada —
            Envie um email caso identifique algum erro, inconsistência ou tenha alguma sugestão de melhoria. O autor não se responsabiliza pelo uso das informações aqui apresentadas.
          </p>
        </footer>
      </div>
    </div>
  );
}
