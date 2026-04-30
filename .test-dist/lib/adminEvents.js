"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readRawEvents = readRawEvents;
exports.writeRawEvents = writeRawEvents;
exports.dateToHtml = dateToHtml;
exports.oilEventToInput = oilEventToInput;
exports.addEvent = addEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.listEvents = listEvents;
/**
 * Server-only helpers for reading and writing data/events.json.
 * Never import this in client components.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const date_1 = require("./date");
const EVENTS_PATH = path_1.default.join(process.cwd(), "data", "events.json");
// ── Raw file access ────────────────────────────────────────────────────────────
function readRawEvents() {
    return fs_1.default.readFileSync(EVENTS_PATH, "utf-8");
}
function writeRawEvents(text) {
    // Validate JSON before writing
    JSON.parse(text);
    fs_1.default.writeFileSync(EVENTS_PATH, text, "utf-8");
}
/** Convert a date from Date object to "YYYY-MM-DD" (HTML input format) */
function dateToHtml(date) {
    return (0, date_1.serializeLocalDate)(date);
}
// ── OilEvent → AdminEventInput (for pre-filling edit forms) ──────────────────
function oilEventToInput(ev) {
    return {
        id: ev.id,
        title: ev.title,
        start_date: dateToHtml(ev.start_date),
        end_date: ev.end_date ? dateToHtml(ev.end_date) : undefined,
        country: ev.country,
        region: ev.region,
        type: ev.type,
        company: ev.company,
        wikipedia: ev.wikipedia,
        description: ev.description,
    };
}
function readAll() {
    return JSON.parse(fs_1.default.readFileSync(EVENTS_PATH, "utf-8"));
}
function writeAll(events) {
    fs_1.default.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2), "utf-8");
}
function inputToStored(ev) {
    return {
        id: ev.id,
        title: ev.title,
        start_date: ev.start_date,
        end_date: ev.end_date || null,
        country: ev.country,
        region: ev.region,
        type: ev.type,
        company: ev.company || null,
        wikipedia: ev.wikipedia || null,
        description: ev.description.trim(),
    };
}
// ── CRUD ──────────────────────────────────────────────────────────────────────
function addEvent(ev) {
    const events = readAll();
    if (events.find((e) => e.id === ev.id)) {
        throw new Error(`Event "${ev.id}" already exists`);
    }
    events.push(inputToStored(ev));
    events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
    writeAll(events);
}
function updateEvent(id, ev) {
    const events = readAll();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1)
        throw new Error(`Event "${id}" not found`);
    events[idx] = inputToStored(ev);
    events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
    writeAll(events);
}
function deleteEvent(id) {
    const events = readAll();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1)
        throw new Error(`Event "${id}" not found`);
    events.splice(idx, 1);
    writeAll(events);
}
function listEvents() {
    const stored = readAll();
    const events = [];
    for (const item of stored) {
        if (!item.id || !item.title || !item.start_date)
            continue;
        const start_date = (0, date_1.parseLocalDate)(item.start_date);
        if (isNaN(start_date.getTime()))
            continue;
        const end_date = item.end_date ? (0, date_1.parseLocalDate)(item.end_date) : undefined;
        events.push({
            id: item.id,
            title: item.title,
            start_date,
            end_date: end_date && !isNaN(end_date.getTime()) ? end_date : undefined,
            country: item.country ?? "Unknown",
            region: item.region ?? "Other",
            type: item.type,
            company: item.company ?? undefined,
            wikipedia: item.wikipedia ?? undefined,
            description: item.description ?? "",
        });
    }
    return events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
}
