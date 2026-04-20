import { TimelineScale } from "@/types";

export const MIN_PX_PER_DAY = 0.04;
export const DEFAULT_PX_PER_DAY = 1.8;
export const MAX_PX_PER_DAY = 25;


const MS_PER_DAY = 86_400_000;

// Extra blank space at both edges so labels at the timeline boundaries aren't clipped
const TIMELINE_EDGE_PX = 300;

export function buildScale(
  domainStart: Date,
  domainEnd: Date,
  pxPerDay: number
): TimelineScale {
  const domainStartMs = domainStart.getTime();
  const domainEndMs   = domainEnd.getTime();
  const totalDays     = (domainEndMs - domainStartMs) / MS_PER_DAY;
  const totalWidthPx  = Math.max(Math.ceil(totalDays * pxPerDay), 1) + 2 * TIMELINE_EDGE_PX;

  function toPixel(date: Date): number {
    const ms = date.getTime();
    return TIMELINE_EDGE_PX + Math.round(((ms - domainStartMs) / MS_PER_DAY) * pxPerDay);
  }

  function toDate(pixel: number): Date {
    const adjustedPx = pixel - TIMELINE_EDGE_PX;
    return new Date(Math.round(domainStartMs + (adjustedPx / pxPerDay) * MS_PER_DAY));
  }

  return { toPixel, toDate, domainStart, domainEnd, totalWidthPx, pxPerDay };
}

export function getDefaultDomain(
  events: { start_date: Date; end_date?: Date }[]
): [Date, Date] {
  const now = new Date();
  const futureYear = now.getFullYear() + 4;

  if (events.length === 0) {
    return [new Date(now.getFullYear() - 10, 0, 1), new Date(futureYear, 11, 31)];
  }
  const dates = events.flatMap((e) =>
    e.end_date ? [e.start_date, e.end_date] : [e.start_date]
  );
  const minMs = Math.min(...dates.map((d) => d.getTime()));
  const maxMs = Math.max(...dates.map((d) => d.getTime()));
  const min = new Date(minMs);
  const max = new Date(maxMs);
  min.setFullYear(min.getFullYear() - 2);
  // Domain end: always at least current year + 4
  max.setFullYear(Math.max(max.getFullYear() + 2, futureYear));
  return [min, max];
}
