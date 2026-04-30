"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PX_PER_DAY = exports.DEFAULT_PX_PER_DAY = exports.MIN_PX_PER_DAY = void 0;
exports.buildScale = buildScale;
exports.getDefaultDomain = getDefaultDomain;
exports.MIN_PX_PER_DAY = 0.04;
exports.DEFAULT_PX_PER_DAY = 1.8;
exports.MAX_PX_PER_DAY = 25;
const MS_PER_DAY = 86400000;
// Extra blank space at both edges so labels at the timeline boundaries aren't clipped
const TIMELINE_EDGE_PX = 300;
function buildScale(domainStart, domainEnd, pxPerDay) {
    const domainStartMs = domainStart.getTime();
    const domainEndMs = domainEnd.getTime();
    const totalDays = (domainEndMs - domainStartMs) / MS_PER_DAY;
    const totalWidthPx = Math.max(Math.ceil(totalDays * pxPerDay), 1) + 2 * TIMELINE_EDGE_PX;
    function toPixel(date) {
        const ms = date.getTime();
        return TIMELINE_EDGE_PX + Math.round(((ms - domainStartMs) / MS_PER_DAY) * pxPerDay);
    }
    function toDate(pixel) {
        const adjustedPx = pixel - TIMELINE_EDGE_PX;
        return new Date(Math.round(domainStartMs + (adjustedPx / pxPerDay) * MS_PER_DAY));
    }
    return { toPixel, toDate, domainStart, domainEnd, totalWidthPx, pxPerDay };
}
function getDefaultDomain(events) {
    const now = new Date();
    const futureYear = now.getFullYear() + 4;
    if (events.length === 0) {
        return [new Date(now.getFullYear() - 10, 0, 1), new Date(futureYear, 11, 31)];
    }
    const dates = events.flatMap((e) => e.end_date ? [e.start_date, e.end_date] : [e.start_date]);
    const minMs = dates.reduce((m, d) => Math.min(m, d.getTime()), Infinity);
    const maxMs = dates.reduce((m, d) => Math.max(m, d.getTime()), -Infinity);
    const min = new Date(minMs);
    const max = new Date(maxMs);
    min.setFullYear(min.getFullYear() - 2);
    // Domain end: always at least current year + 4
    max.setFullYear(Math.max(max.getFullYear() + 2, futureYear));
    return [min, max];
}
