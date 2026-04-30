"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEventDate = formatEventDate;
exports.isBrasil = isBrasil;
exports.groupEventsByRegion = groupEventsByRegion;
exports.clamp = clamp;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
function formatEventDate(date, endDate) {
    const fmt = (d) => (0, date_fns_1.format)(d, "dd MMM yyyy", { locale: locale_1.ptBR });
    return endDate ? `${fmt(date)} – ${fmt(endDate)}` : fmt(date);
}
function isBrasil(country) {
    const c = country.toLowerCase().trim();
    return c === "brasil" || c === "brazil";
}
function groupEventsByRegion(events) {
    const grouped = new Map();
    for (const e of events) {
        if (!grouped.has(e.region))
            grouped.set(e.region, new Map());
        const regionMap = grouped.get(e.region);
        if (!regionMap.has(e.country))
            regionMap.set(e.country, []);
        regionMap.get(e.country).push(e);
    }
    // Sort countries within each region by event count desc, Brasil always first
    for (const [, countries] of grouped) {
        const countryEntries = Array.from(countries.entries()).sort(([ca, ea], [cb, eb]) => {
            if (isBrasil(ca) && !isBrasil(cb))
                return -1;
            if (!isBrasil(ca) && isBrasil(cb))
                return 1;
            return eb.length - ea.length;
        });
        countries.clear();
        for (const [country, evts] of countryEntries)
            countries.set(country, evts);
    }
    // Sort regions: Global first, then by event count desc
    const regionEventCount = (entries) => Array.from(entries.values()).reduce((sum, evts) => sum + evts.length, 0);
    const sorted = Array.from(grouped.entries()).sort(([ra, ca], [rb, cb]) => {
        const order = [
            "Global",
            "América Central e do Sul",
            "América do Norte",
            "Oriente Médio",
            "Europa",
            "Ásia",
            "África",
            "Outros",
        ];
        const ia = order.indexOf(ra);
        const ib = order.indexOf(rb);
        if (ia !== -1 || ib !== -1) {
            if (ia === -1)
                return 1;
            if (ib === -1)
                return -1;
            return ia - ib;
        }
        // Fallback: by event count desc (keeps unknown/new regions stable-ish)
        return regionEventCount(cb) - regionEventCount(ca);
    });
    return new Map(sorted);
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
