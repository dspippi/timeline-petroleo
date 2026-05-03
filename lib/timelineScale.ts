import { TimelineScale } from "@/types";

export const MIN_PX_PER_DAY = 0.04;
export const DEFAULT_PX_PER_DAY = 1.8;
export const MAX_PX_PER_DAY = 25;


const MS_PER_DAY = 86_400_000;

function clampPxPerDay(pxPerDay: number): number {
  return Math.min(MAX_PX_PER_DAY, Math.max(MIN_PX_PER_DAY, pxPerDay));
}

export function getFitPxPerDay(
  currentPxPerDay: number,
  containerWidth: number,
  totalWidthPx: number,
  labelWidth: number,
): number {
  const plotWidth = Math.max(containerWidth - labelWidth, 1);
  const safeTotalWidthPx = Math.max(totalWidthPx, 1);
  return clampPxPerDay((currentPxPerDay * plotWidth) / safeTotalWidthPx);
}

export function getZoomPercent(pxPerDay: number, basePxPerDay: number): number {
  const safeBasePxPerDay = basePxPerDay > 0 ? basePxPerDay : DEFAULT_PX_PER_DAY;
  return Math.round((pxPerDay / safeBasePxPerDay) * 100);
}

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

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / MS_PER_DAY);
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
}

// Footprint radius of a point event — mirrors POINT_HALF in TimelineRows.tsx
const DENSITY_POINT_HALF = 65;

export function buildDensityScale(
  events: { start_date: Date; end_date?: Date; country: string }[],
  domainStart: Date,
  domainEnd: Date,
  pxPerDay: number,
): TimelineScale {
  const domainStartMs = domainStart.getTime();
  const domainEndMs   = domainEnd.getTime();
  const totalDays     = (domainEndMs - domainStartMs) / MS_PER_DAY;
  const totalWidthPx  = Math.max(Math.ceil(totalDays * pxPerDay), 1) + 2 * TIMELINE_EDGE_PX;
  const plotWidth     = totalWidthPx - 2 * TIMELINE_EDGE_PX;

  const startYear = domainStart.getFullYear();
  const endYear   = domainEnd.getFullYear();
  const numYears  = endYear - startYear + 1;

  // Group events by country, sorted by date.
  const byCountry = new Map<string, Date[]>();
  for (const ev of events) {
    const y = ev.start_date.getFullYear();
    if (y < startYear || y > endYear) continue;
    if (!byCountry.has(ev.country)) byCountry.set(ev.country, []);
    byCountry.get(ev.country)!.push(ev.start_date);
  }

  // Only dilate where a same-country cluster would force >2 lanes.
  // Greedy lane assignment caps at 2 lanes iff every (i, i+2) pair of same-country
  // events is ≥ 2*POINT_HALF px apart. Skip pairs already satisfied at uniform zoom.
  // Crucially, dilation is applied ONLY to years that contain events of the cluster's
  // country — empty years between sparse events stay compressed.
  const BASE_PX = 4;
  const reqPxPerDay = new Array<number>(numYears).fill(0);
  const hasEvent    = new Array<boolean>(numYears).fill(false);

  for (const ev of events) {
    const y = ev.start_date.getFullYear();
    if (y >= startYear && y <= endYear) hasEvent[y - startYear] = true;
  }

  for (const dates of byCountry.values()) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    const countryYears = new Set<number>();
    for (const d of dates) {
      const y = d.getFullYear();
      if (y >= startYear && y <= endYear) countryYears.add(y - startYear);
    }
    for (let i = 0; i < dates.length - 2; i++) {
      const days = (dates[i + 2].getTime() - dates[i].getTime()) / MS_PER_DAY;
      if (days <= 0) continue;
      const needed = (DENSITY_POINT_HALF * 2) / days;
      if (needed <= pxPerDay) continue; // already satisfied at uniform zoom
      const y1 = Math.max(dates[i].getFullYear(),     startYear);
      const y2 = Math.min(dates[i + 2].getFullYear(), endYear);
      for (let y = y1; y <= y2; y++) {
        const idx = y - startYear;
        if (!countryYears.has(idx)) continue; // skip years without this country's events
        reqPxPerDay[idx] = Math.max(reqPxPerDay[idx], needed);
      }
    }
  }

  // Year widths: overcrowded → expanded, eventful → uniform, empty → compressed.
  const requiredWidths = new Array<number>(numYears);
  for (let i = 0; i < numYears; i++) {
    const dy = daysInYear(startYear + i);
    if (reqPxPerDay[i] > 0)      requiredWidths[i] = reqPxPerDay[i] * dy;
    else if (hasEvent[i])         requiredWidths[i] = pxPerDay * dy;
    else                          requiredWidths[i] = BASE_PX;
  }

  const totalRequired   = requiredWidths.reduce((a, b) => a + b, 0);
  const effPlotWidth    = totalRequired;
  const effTotalWidthPx = Math.ceil(effPlotWidth) + 2 * TIMELINE_EDGE_PX;

  // Build cumulative pixel breakpoints (length = numYears + 1)
  const cumulativePx = new Array<number>(numYears + 1).fill(0);
  for (let i = 0; i < numYears; i++) {
    cumulativePx[i + 1] = cumulativePx[i] + effPlotWidth * requiredWidths[i] / totalRequired;
  }

  function toPixel(date: Date): number {
    const y = date.getFullYear();
    if (y < startYear) return TIMELINE_EDGE_PX;
    if (y > endYear)   return TIMELINE_EDGE_PX + effPlotWidth;
    const idx  = Math.min(y - startYear, numYears - 1);
    const frac = dayOfYear(date) / daysInYear(y);
    const segStart = cumulativePx[idx];
    const segEnd   = cumulativePx[idx + 1];
    return TIMELINE_EDGE_PX + Math.round(segStart + frac * (segEnd - segStart));
  }

  function toDate(pixel: number): Date {
    const plotPx = Math.max(0, Math.min(pixel - TIMELINE_EDGE_PX, effPlotWidth));
    let lo = 0, hi = numYears - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cumulativePx[mid] <= plotPx) lo = mid; else hi = mid - 1;
    }
    const segStart = cumulativePx[lo];
    const segEnd   = cumulativePx[lo + 1];
    const frac = segEnd === segStart ? 0 : (plotPx - segStart) / (segEnd - segStart);
    const days = Math.round(frac * daysInYear(startYear + lo));
    return new Date(startYear + lo, 0, 1 + days);
  }

  return { toPixel, toDate, domainStart, domainEnd, totalWidthPx: effTotalWidthPx, pxPerDay };
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
  const minMs = dates.reduce((m, d) => Math.min(m, d.getTime()), Infinity);
  const maxMs = dates.reduce((m, d) => Math.max(m, d.getTime()), -Infinity);
  const min = new Date(minMs);
  const max = new Date(maxMs);
  min.setFullYear(min.getFullYear() - 2);
  // Domain end: always at least current year + 4
  max.setFullYear(Math.max(max.getFullYear() + 2, futureYear));
  return [min, max];
}
