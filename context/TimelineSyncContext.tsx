"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { DEFAULT_PX_PER_DAY } from "@/lib/timelineScale";

// ─────────────────────────────────────────────────────────────────────────────
// Four separate contexts so each consumer only re-renders when its slice changes.
//
//  HoverStateCtx   — hoveredDate value  (changes ~60fps during mousemove)
//  HoverSetterCtx  — setHoveredDate fn  (stable, never changes)
//  ZoomStateCtx    — pxPerDay value     (changes on zoom)
//  ZoomSetterCtx   — setPxPerDay fn     (stable, never changes)
//
// Rule of thumb:
//   • Need to READ  hoveredDate → useHoveredDate()
//   • Need to WRITE hoveredDate → useSetHoveredDate()   ← won't re-render on hover
//   • Need to READ  pxPerDay   → usePxPerDay()
//   • Need to WRITE pxPerDay   → useSetPxPerDay()       ← won't re-render on zoom
// ─────────────────────────────────────────────────────────────────────────────

// ── Hover state ───────────────────────────────────────────────────────────────
interface HoverState { hoveredDate: Date | null }
const HoverStateCtx = createContext<HoverState>({ hoveredDate: null });

// ── Hover setter (value never changes → zero consumer re-renders) ──────────────
interface HoverSetter { setHoveredDate: (d: Date | null) => void }
const HoverSetterCtx = createContext<HoverSetter>({ setHoveredDate: () => {} });

// ── Zoom state ────────────────────────────────────────────────────────────────
interface ZoomState { pxPerDay: number }
const ZoomStateCtx = createContext<ZoomState>({ pxPerDay: DEFAULT_PX_PER_DAY });

// ── Zoom setter (stable) ──────────────────────────────────────────────────────
interface ZoomSetter { setPxPerDay: (v: number) => void }
const ZoomSetterCtx = createContext<ZoomSetter>({ setPxPerDay: () => {} });

// ── Provider ──────────────────────────────────────────────────────────────────
export function TimelineSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredDate, _setHoveredDate] = useState<Date | null>(null);
  const [pxPerDay, _setPxPerDay] = useState(DEFAULT_PX_PER_DAY);

  // Stable callbacks — these never change reference
  const setHoveredDate = useCallback((d: Date | null) => _setHoveredDate(d), []);
  const setPxPerDay    = useCallback((v: number)      => _setPxPerDay(v),    []);

  // Memoize setter objects so their context values are also stable
  const hoverSetter = useMemo(() => ({ setHoveredDate }), [setHoveredDate]);
  const zoomSetter  = useMemo(() => ({ setPxPerDay }),    [setPxPerDay]);

  return (
    <HoverSetterCtx.Provider value={hoverSetter}>
      <ZoomSetterCtx.Provider value={zoomSetter}>
        <HoverStateCtx.Provider value={{ hoveredDate }}>
          <ZoomStateCtx.Provider value={{ pxPerDay }}>
            {children}
          </ZoomStateCtx.Provider>
        </HoverStateCtx.Provider>
      </ZoomSetterCtx.Provider>
    </HoverSetterCtx.Provider>
  );
}

// ── Fine-grained hooks ────────────────────────────────────────────────────────

/** Re-renders when hoveredDate changes (~60fps during hover). */
export function useHoveredDate() {
  return useContext(HoverStateCtx).hoveredDate;
}

/** Stable — never triggers a re-render. */
export function useSetHoveredDate() {
  return useContext(HoverSetterCtx).setHoveredDate;
}

/** Re-renders when pxPerDay changes (zoom). */
export function usePxPerDay() {
  return useContext(ZoomStateCtx).pxPerDay;
}

/** Stable — never triggers a re-render. */
export function useSetPxPerDay() {
  return useContext(ZoomSetterCtx).setPxPerDay;
}

// ── Legacy combined hook (use only when you genuinely need all four values) ───
export function useTimelineSync() {
  const hoveredDate    = useHoveredDate();
  const setHoveredDate = useSetHoveredDate();
  const pxPerDay       = usePxPerDay();
  const setPxPerDay    = useSetPxPerDay();
  return { hoveredDate, setHoveredDate, pxPerDay, setPxPerDay };
}
