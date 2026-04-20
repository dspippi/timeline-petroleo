/**
 * Server-only helpers for reading and writing data/events.json.
 * Never import this in client components.
 */
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { OilEvent, EventType } from "@/types";

const EVENTS_PATH = path.join(process.cwd(), "data", "events.json");

// ── Raw file access ────────────────────────────────────────────────────────────

export function readRawEvents(): string {
  return fs.readFileSync(EVENTS_PATH, "utf-8");
}

export function writeRawEvents(text: string): void {
  // Validate JSON before writing
  JSON.parse(text);
  fs.writeFileSync(EVENTS_PATH, text, "utf-8");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminEventInput {
  id: string;
  title: string;
  start_date: string;   // "YYYY-MM-DD" (HTML date input format)
  end_date?: string;
  country: string;
  region: string;
  type: EventType;
  company?: string;
  wikipedia?: string;
  description: string;
}

/** Convert a date from Date object to "YYYY-MM-DD" (HTML input format) */
export function dateToHtml(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ── OilEvent → AdminEventInput (for pre-filling edit forms) ──────────────────

export function oilEventToInput(ev: OilEvent): AdminEventInput {
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

// ── JSON helpers ──────────────────────────────────────────────────────────────

interface StoredEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  country: string;
  region: string;
  type: string;
  company: string | null;
  wikipedia: string | null;
  description: string;
}

function readAll(): StoredEvent[] {
  return JSON.parse(fs.readFileSync(EVENTS_PATH, "utf-8"));
}

function writeAll(events: StoredEvent[]): void {
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2), "utf-8");
}

function inputToStored(ev: AdminEventInput): StoredEvent {
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

export function addEvent(ev: AdminEventInput): void {
  const events = readAll();
  if (events.find((e) => e.id === ev.id)) {
    throw new Error(`Event "${ev.id}" already exists`);
  }
  events.push(inputToStored(ev));
  events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  writeAll(events);
}

export function updateEvent(id: string, ev: AdminEventInput): void {
  const events = readAll();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error(`Event "${id}" not found`);
  events[idx] = inputToStored(ev);
  events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  writeAll(events);
}

export function deleteEvent(id: string): void {
  const events = readAll();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error(`Event "${id}" not found`);
  events.splice(idx, 1);
  writeAll(events);
}

/** Parse "YYYY-MM-DD" as local midnight (avoids UTC timezone shift). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function listEvents(): OilEvent[] {
  const stored = readAll();
  const events: OilEvent[] = [];

  for (const item of stored) {
    if (!item.id || !item.title || !item.start_date) continue;
    const start_date = parseLocalDate(item.start_date);
    if (isNaN(start_date.getTime())) continue;
    const end_date = item.end_date ? parseLocalDate(item.end_date) : undefined;

    events.push({
      id: item.id,
      title: item.title,
      start_date,
      end_date: end_date && !isNaN(end_date.getTime()) ? end_date : undefined,
      country: item.country ?? "Unknown",
      region: item.region ?? "Other",
      type: item.type as EventType,
      company: item.company ?? undefined,
      wikipedia: item.wikipedia ?? undefined,
      description: item.description ?? "",
    });
  }

  return events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
}
