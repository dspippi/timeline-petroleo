"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { DEFAULT_PX_PER_DAY } from "@/lib/timelineScale";

interface SyncContextValue {
  hoveredDate: Date | null;
  setHoveredDate: (d: Date | null) => void;
  pxPerDay: number;
  setPxPerDay: (v: number) => void;
}

const TimelineSyncContext = createContext<SyncContextValue | null>(null);

export function TimelineSyncProvider({ children }: { children: ReactNode }) {
  const [hoveredDate, _setHoveredDate] = useState<Date | null>(null);
  const [pxPerDay, _setPxPerDay] = useState(DEFAULT_PX_PER_DAY);

  const setHoveredDate = useCallback((d: Date | null) => _setHoveredDate(d), []);
  const setPxPerDay = useCallback((v: number) => _setPxPerDay(v), []);

  return (
    <TimelineSyncContext.Provider
      value={{ hoveredDate, setHoveredDate, pxPerDay, setPxPerDay }}
    >
      {children}
    </TimelineSyncContext.Provider>
  );
}

export function useTimelineSync() {
  const ctx = useContext(TimelineSyncContext);
  if (!ctx) throw new Error("useTimelineSync must be used inside TimelineSyncProvider");
  return ctx;
}
