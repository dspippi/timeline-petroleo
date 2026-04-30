"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOilPrices = getOilPrices;
const date_fns_1 = require("date-fns");
let _cache = null;
function parseJsonPrices(rows) {
    return rows
        .map((d) => {
        const date = (0, date_fns_1.parseISO)(d.date);
        if (!(0, date_fns_1.isValid)(date))
            return null;
        return { date, price: d.price };
    })
        .filter((x) => x !== null);
}
async function loadBase() {
    const [hist, fallback] = await Promise.all([
        Promise.resolve().then(() => __importStar(require("@/data/oil-prices-owid-historical.json"))).then((m) => m.default),
        Promise.resolve().then(() => __importStar(require("@/data/oil-prices-fallback.json"))).then((m) => m.default),
    ]);
    // OWID covers 1861–1986 (annual→monthly, $/barrel); fallback covers 1987–present (monthly Brent)
    return [...parseJsonPrices(hist), ...parseJsonPrices(fallback)];
}
async function fetchEiaFrom(startYearMonth) {
    const apiKey = process.env.NEXT_PUBLIC_EIA_API_KEY;
    if (!apiKey)
        return [];
    try {
        const url = `https://api.eia.gov/v2/petroleum/pri/spt/data/` +
            `?api_key=${apiKey}` +
            `&frequency=monthly` +
            `&data[0]=value` +
            `&facets[series][]=RBRTE` +
            `&start=${startYearMonth}` +
            `&sort[0][column]=period` +
            `&sort[0][direction]=asc` +
            `&offset=0&length=120`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok)
            return [];
        const json = await res.json();
        const rows = json?.response?.data ?? [];
        return rows
            .map((d) => {
            const date = (0, date_fns_1.parseISO)(d.period + "-01");
            const price = parseFloat(d.value);
            if (!(0, date_fns_1.isValid)(date) || isNaN(price))
                return null;
            return { date, price };
        })
            .filter((x) => x !== null);
    }
    catch {
        return [];
    }
}
async function getOilPrices() {
    if (_cache)
        return _cache;
    const base = await loadBase();
    // Browser: use static data immediately (no CORS issues)
    if (typeof window !== "undefined") {
        _cache = base;
        return _cache;
    }
    // Server: fetch EIA data starting from the month after the last base entry
    const lastBase = base[base.length - 1];
    if (!lastBase) {
        _cache = base;
        return _cache;
    }
    const next = new Date(lastBase.date.getFullYear(), lastBase.date.getMonth() + 1, 1);
    const startYearMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    const live = await fetchEiaFrom(startYearMonth);
    if (live.length === 0) {
        _cache = base;
        return _cache;
    }
    _cache = [...base, ...live];
    return _cache;
}
