import { TimelineScale } from "@/types";

export const MIN_PX_PER_DAY = 0.04;
export const DEFAULT_PX_PER_DAY = 1.8;
export const MAX_PX_PER_DAY = 25;

export const DEFAULT_compressionRatio = 0.06;
const EVENT_BUFFER_DAYS = 180;    // 6-month buffer around each event

interface Breakpoint { dateMs: number; px: number }

function mergeDateRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const result: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      result.push([sorted[i][0], sorted[i][1]]);
    }
  }
  return result;
}

export function buildScale(
  domainStart: Date,
  domainEnd: Date,
  pxPerDay: number,
  events: { start_date: Date; end_date?: Date }[] = [],
  compressionRatio: number = DEFAULT_compressionRatio
): TimelineScale {
  const domainStartMs = domainStart.getTime();
  const domainEndMs = domainEnd.getTime();
  const bufferMs = EVENT_BUFFER_DAYS * 86_400_000;

  const windows: [number, number][] = events
    .map((e) => [
      Math.max(e.start_date.getTime() - bufferMs, domainStartMs),
      Math.min(
        (e.end_date ? e.end_date.getTime() : e.start_date.getTime()) + bufferMs,
        domainEndMs
      ),
    ] as [number, number])
    .filter(([s, e]) => s < e);

  const merged = mergeDateRanges(windows);

  // Build piecewise-linear breakpoints mapping dateMs ↔ px
  const bps: Breakpoint[] = [{ dateMs: domainStartMs, px: 0 }];
  let px = 0;
  let cursor = domainStartMs;

  for (const [ws, we] of merged) {
    if (cursor < ws) {
      // Inactive gap → compressed
      px += ((ws - cursor) / 86_400_000) * pxPerDay * compressionRatio;
      bps.push({ dateMs: ws, px: Math.round(px) });
      cursor = ws;
    }
    if (cursor < we) {
      // Active window → full density
      px += ((we - cursor) / 86_400_000) * pxPerDay;
      bps.push({ dateMs: we, px: Math.round(px) });
      cursor = we;
    }
  }

  if (cursor < domainEndMs) {
    // Trailing inactive
    px += ((domainEndMs - cursor) / 86_400_000) * pxPerDay * compressionRatio;
    bps.push({ dateMs: domainEndMs, px: Math.round(px) });
  }

  const totalWidthPx = Math.max(Math.ceil(px), 1);

  function toPixel(date: Date): number {
    const ms = date.getTime();
    if (ms <= domainStartMs) return 0;
    if (ms >= domainEndMs) return totalWidthPx;
    let lo = 0, hi = bps.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (bps[mid].dateMs <= ms) lo = mid; else hi = mid;
    }
    const t = (ms - bps[lo].dateMs) / (bps[hi].dateMs - bps[lo].dateMs);
    return Math.round(bps[lo].px + t * (bps[hi].px - bps[lo].px));
  }

  function toDate(pixel: number): Date {
    if (pixel <= 0) return new Date(domainStartMs);
    if (pixel >= totalWidthPx) return new Date(domainEndMs);
    let lo = 0, hi = bps.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (bps[mid].px <= pixel) lo = mid; else hi = mid;
    }
    const t = (pixel - bps[lo].px) / (bps[hi].px - bps[lo].px);
    return new Date(Math.round(bps[lo].dateMs + t * (bps[hi].dateMs - bps[lo].dateMs)));
  }

  return { toPixel, toDate, domainStart, domainEnd, totalWidthPx, pxPerDay };
}

export function getDefaultDomain(
  events: { start_date: Date; end_date?: Date }[]
): [Date, Date] {
  if (events.length === 0) {
    const now = new Date();
    return [new Date(now.getFullYear() - 10, 0, 1), now];
  }
  const dates = events.flatMap((e) =>
    e.end_date ? [e.start_date, e.end_date] : [e.start_date]
  );
  const minMs = Math.min(...dates.map((d) => d.getTime()));
  const maxMs = Math.max(...dates.map((d) => d.getTime()));
  const min = new Date(minMs);
  const max = new Date(maxMs);
  min.setFullYear(min.getFullYear() - 2);
  max.setFullYear(max.getFullYear() + 2);
  return [min, max];
}
