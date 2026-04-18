/**
 * Server-only helpers for reading and writing data/events.md.
 * Never import this in client components.
 */
import fs from "fs";
import path from "path";
import { format, parse, isValid } from "date-fns";
import { OilEvent, EventType } from "@/types";

const EVENTS_PATH = path.join(process.cwd(), "data", "events.md");
const VALID_TYPES = new Set<EventType>(["war", "discovery", "policy", "company", "crisis"]);

// ── Raw file access ────────────────────────────────────────────────────────────

export function readRawEvents(): string {
  return fs.readFileSync(EVENTS_PATH, "utf-8");
}

export function writeRawEvents(text: string): void {
  fs.writeFileSync(EVENTS_PATH, text, "utf-8");
}

// ── Serialization ──────────────────────────────────────────────────────────────

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

/** Convert a date string from "YYYY-MM-DD" (HTML) to "DD-MM-YYYY" (events.md format) */
function htmlDateToMd(date: string): string {
  const d = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(d)) return date;
  return format(d, "dd-MM-yyyy");
}

/** Convert a date from Date object to "DD-MM-YYYY" */
function dateToCMd(date: Date): string {
  return format(date, "dd-MM-yyyy");
}

/** Convert a date from Date object to "YYYY-MM-DD" (HTML input format) */
export function dateToHtml(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Serialize an AdminEventInput to an events.md block */
export function serializeEvent(ev: AdminEventInput): string {
  const lines: string[] = [
    "---",
    `id: ${ev.id}`,
    `title: "${ev.title.replace(/"/g, '\\"')}"`,
    `start_date: ${htmlDateToMd(ev.start_date)}`,
  ];
  if (ev.end_date) lines.push(`end_date: ${htmlDateToMd(ev.end_date)}`);
  lines.push(`country: ${ev.country}`);
  lines.push(`region: ${ev.region}`);
  lines.push(`type: ${ev.type}`);
  if (ev.company) lines.push(`company: ${ev.company}`);
  if (ev.wikipedia) lines.push(`wikipedia: ${ev.wikipedia}`);
  lines.push("---");
  lines.push(ev.description.trim());
  return lines.join("\n");
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

// ── Splitting helper ──────────────────────────────────────────────────────────

/**
 * Split events.md into individual blocks.
 * Returns array of raw block strings (without leading "---").
 */
function splitBlocks(raw: string): string[] {
  return raw
    .split(/(?:^|\n)---\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Find block index containing a given id */
function findBlockIndex(blocks: string[], id: string): number {
  return blocks.findIndex((b) => {
    const match = b.match(/^id:\s*(.+)$/m);
    return match && match[1].trim() === id;
  });
}

/** Join blocks back into a valid events.md string */
function joinBlocks(blocks: string[]): string {
  return blocks.map((b) => `---\n${b}`).join("\n") + "\n";
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function addEvent(ev: AdminEventInput): void {
  const raw = readRawEvents();
  const block = ev.description.trim()
    ? serializeEvent(ev)
    : serializeEvent({ ...ev, description: "" });
  // Append with separator
  const separator = raw.endsWith("\n") ? "\n" : "\n\n";
  writeRawEvents(raw + separator + block + "\n");
}

export function updateEvent(id: string, ev: AdminEventInput): void {
  const raw = readRawEvents();
  const blocks = splitBlocks(raw);
  const idx = findBlockIndex(blocks, id);
  if (idx === -1) throw new Error(`Event "${id}" not found`);

  // Build new block content (without leading "---")
  const newBlock = serializeEvent(ev)
    .replace(/^---\n/, "")  // remove leading ---
    .trimEnd();

  blocks[idx] = newBlock;
  writeRawEvents(joinBlocks(blocks));
}

export function deleteEvent(id: string): void {
  const raw = readRawEvents();
  const blocks = splitBlocks(raw);
  const idx = findBlockIndex(blocks, id);
  if (idx === -1) throw new Error(`Event "${id}" not found`);
  blocks.splice(idx, 1);
  writeRawEvents(joinBlocks(blocks));
}

// ── List (re-uses parseEvents logic inline to avoid circular deps) ─────────────

import matter from "gray-matter";

function parseDateField(raw: unknown): Date | null {
  if (raw instanceof Date) return isValid(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const d = parse(String(raw).trim(), "dd-MM-yyyy", new Date());
  return isValid(d) ? d : null;
}

export function listEvents(): OilEvent[] {
  const raw = readRawEvents();
  const chunks = raw
    .split(/(?:^|\n)---\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const events: OilEvent[] = [];
  for (const chunk of chunks) {
    try {
      const { data, content } = matter(`---\n${chunk}`);
      if (!data.id || !data.title) continue;
      const start_date = parseDateField(data.start_date);
      if (!start_date) continue;
      const end_date = data.end_date ? parseDateField(data.end_date) ?? undefined : undefined;
      const type: EventType = VALID_TYPES.has(data.type) ? data.type : "policy";
      events.push({
        id: String(data.id),
        title: String(data.title),
        start_date,
        end_date,
        country: String(data.country ?? "Unknown"),
        region: String(data.region ?? "Other"),
        type,
        company: data.company ? String(data.company) : undefined,
        wikipedia: data.wikipedia ? String(data.wikipedia) : undefined,
        description: content.trim(),
      });
    } catch { /* skip */ }
  }
  return events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
}
