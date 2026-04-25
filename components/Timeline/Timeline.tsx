"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OilEvent, TimelineScale, EventType } from "@/types";
import { usePxPerDay, useSetPxPerDay, useSetHoveredDate } from "@/context/TimelineSyncContext";
import { MIN_PX_PER_DAY, MAX_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { TimelineRows, LABEL_WIDTH } from "./TimelineRows";
import { GuideOverlay } from "./GuideOverlay";
import { getYear } from "date-fns";
import pkg from "@/package.json";

// ─── Momentum / Inertia configuration ────────────────────────────────────────
// Adjust these values to tune the pan inertia feel.
const MOMENTUM = {
  // Velocity decay multiplier applied every animation frame (60 fps assumed).
  // Range: 0 (instant stop) → 1 (never stops). Higher = more glide.
  friction: 0.90,

  // Stop the animation when |velocity| drops below this threshold (px/frame).
  // Lower values = longer tail; higher values = snappier stop.
  minVelocity: 0.8,

  // Time window (ms) used to sample pointer velocity on release.
  // Wider window = smoother but less reactive to fast flicks.
  velocitySampleMs: 80,

  // Maximum initial velocity cap (px/frame) to avoid jarring launches.
  maxVelocity: 60,
};
// ─────────────────────────────────────────────────────────────────────────────

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

  // Drag-to-pan state
  const dragState = useRef<{ startX: number; startY: number; startScrollLeft: number; startScrollTop: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Momentum state — velocity samples and active animation frame
  const velocitySamples = useRef<Array<{ x: number; t: number }>>([]);
  const momentumRaf = useRef<number | null>(null);

  const cancelMomentum = useCallback(() => {
    if (momentumRaf.current !== null) {
      cancelAnimationFrame(momentumRaf.current);
      momentumRaf.current = null;
    }
  }, []);

  const launchMomentum = useCallback((velocityX: number) => {
    cancelMomentum();
    let vx = clamp(velocityX, -MOMENTUM.maxVelocity, MOMENTUM.maxVelocity);

    const step = () => {
      vx *= MOMENTUM.friction;
      if (Math.abs(vx) < MOMENTUM.minVelocity) {
        momentumRaf.current = null;
        return;
      }
      if (scrollRef.current) {
        scrollRef.current.scrollLeft -= vx;
        if (yearAxisRef.current) yearAxisRef.current.scrollLeft = scrollRef.current.scrollLeft;
        onScroll();
      }
      momentumRaf.current = requestAnimationFrame(step);
    };

    momentumRaf.current = requestAnimationFrame(step);
  }, [cancelMomentum, scrollRef, onScroll]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only left button; ignore clicks on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [data-nodrag]")) return;
    cancelMomentum();
    velocitySamples.current = [{ x: e.clientX, t: performance.now() }];
    dragState.current = { startX: e.clientX, startY: e.clientY, startScrollLeft: scrollRef.current?.scrollLeft ?? 0, startScrollTop: scrollRef.current?.scrollTop ?? 0, moved: false };
    setIsDragging(true);
    e.preventDefault();
  }, [scrollRef, cancelMomentum]);

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
      // Track pointer velocity — keep only samples within the sampling window
      const now = performance.now();
      velocitySamples.current.push({ x: e.clientX, t: now });
      const cutoff = now - MOMENTUM.velocitySampleMs;
      velocitySamples.current = velocitySamples.current.filter(s => s.t >= cutoff);
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
    // Treat leave as release — compute velocity and launch momentum
    if (dragState.current?.moved) {
      const samples = velocitySamples.current;
      if (samples.length >= 2) {
        const first = samples[0];
        const last  = samples[samples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0) launchMomentum((last.x - first.x) / (dt / 16.67));
      }
    }
    dragState.current = null;
    velocitySamples.current = [];
    setIsDragging(false);
    setHoveredDate(null);
  }, [setHoveredDate, launchMomentum]);

  const handleMouseUp = useCallback(() => {
    if (dragState.current?.moved) {
      const samples = velocitySamples.current;
      if (samples.length >= 2) {
        const first = samples[0];
        const last  = samples[samples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0) launchMomentum((last.x - first.x) / (dt / 16.67));
      }
    }
    dragState.current = null;
    velocitySamples.current = [];
    setIsDragging(false);
  }, [launchMomentum]);

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

  // Touch inertia — mirrors mouse drag momentum for mobile devices.
  // We take over from native scroll so that both containers stay in sync
  // during the momentum phase (native scroll only scrolls the touched element).
  const touchState = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const touchSamples = useRef<Array<{ x: number; t: number }>>([]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      cancelMomentum();
      const touch = e.touches[0];
      touchState.current = { startX: touch.clientX, startScrollLeft: el.scrollLeft };
      touchSamples.current = [{ x: touch.clientX, t: performance.now() }];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchState.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - touchState.current.startX;
      el.scrollLeft = touchState.current.startScrollLeft - dx;
      if (yearAxisRef.current) yearAxisRef.current.scrollLeft = el.scrollLeft;
      onScroll();
      const now = performance.now();
      touchSamples.current.push({ x: touch.clientX, t: now });
      const cutoff = now - MOMENTUM.velocitySampleMs;
      touchSamples.current = touchSamples.current.filter(s => s.t >= cutoff);
    };

    const onTouchEnd = () => {
      const samples = touchSamples.current;
      if (touchState.current && samples.length >= 2) {
        const first = samples[0];
        const last  = samples[samples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0) launchMomentum((last.x - first.x) / (dt / 16.67));
      }
      touchState.current = null;
      touchSamples.current = [];
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    el.addEventListener("touchcancel",onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef, onScroll, cancelMomentum, launchMomentum]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current && yearAxisRef.current) {
      yearAxisRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
    onScroll();
  }, [onScroll, scrollRef]);

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
      {/* Year axis — fixed header, synced via JS scroll */}
      <div
        ref={yearAxisRef}
        className="shrink-0 overflow-x-hidden overflow-y-hidden bg-app border-b border-line"
        style={{ height: 28 }}
      >
        <div style={{ width: scale.totalWidthPx + LABEL_WIDTH, minWidth: scale.totalWidthPx + LABEL_WIDTH, position: "relative", height: 28 }}>
          {yearTicks.map(({ year, x }) => (
            <div
              key={year}
              className="absolute top-0 bottom-0 flex flex-col items-start"
              style={{ left: x }}
            >
              <div className="w-px h-full bg-line" />
              <span className="absolute top-1 left-1 text-[10px] text-content-tertiary font-mono whitespace-nowrap">
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={scrollRef}
        className="timeline-scroll flex-1 overflow-x-auto overflow-y-auto relative min-h-0 bg-surface"
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
          className="border-t border-line bg-app px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
          style={{ position: "sticky", left: 0, width: "100vw" }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-content-tertiary font-semibold tracking-wide">
              Desenvolvido por{" "}
              <span className="text-content-secondary font-bold">Diogo S. P. Calegari</span>
            </span>
            <span className="hidden sm:inline text-content-muted">·</span>
            <a
              href="mailto:timelinedopetroleo@gmail.com"
              className="hidden sm:inline text-[10px] text-brand hover:text-brand-hover transition-colors"
            >
              timelinedopetroleo@gmail.com
            </a>
            <span className="hidden sm:inline text-content-muted">·</span>
            <span className="hidden sm:inline text-[10px] text-content-tertiary font-mono">v{pkg.version}</span>
          </div>
          <p className="text-[9.5px] text-content-muted leading-relaxed sm:border-l sm:border-black/[0.08] dark:sm:border-[#1d2a36] sm:pl-4">
            Projeto pessoal e independente. Informações baseadas em fontes públicas e literatura especializada —
            Envie um email caso identifique algum erro, inconsistência ou tenha alguma sugestão de melhoria. O autor não se responsabiliza pelo uso das informações aqui apresentadas.
          </p>
        </footer>
      </div>
    </div>
  );
}
