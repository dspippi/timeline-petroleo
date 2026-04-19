import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parse, isValid } from "date-fns";
import { OilEvent, EventType } from "@/types";

const VALID_TYPES = new Set<EventType>(["war", "discovery", "policy", "company", "crisis"]);

function parseDateField(raw: unknown): Date | null {
  if (raw instanceof Date) return isValid(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const d = parse(String(raw).trim(), "dd-MM-yyyy", new Date());
  return isValid(d) ? d : null;
}

export function parseEvents(): OilEvent[] {
  const filePath = path.join(process.cwd(), "data", "events.md");
  const raw = fs.readFileSync(filePath, "utf-8");

  // Each event block starts with --- on its own line.
  // Split on lines that are ONLY "---", then each chunk is "frontmatter\n---\nbody".
  const chunks = raw
    .split(/(?:^|\n)---\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const events: OilEvent[] = [];

  for (const chunk of chunks) {
    try {
      // Support two formats:
      // Format A (original): "field: val\n---\nbody text"  — inner --- separates YAML from body
      // Format B (user-edited): "field: val\nbody text\n." — body follows YAML fields directly, "." as terminator
      let matterStr: string;

      if (chunk.includes("\n---\n") || chunk.startsWith("---\n")) {
        // Format A: inner --- present — use as-is
        matterStr = `---\n${chunk}`;
      } else {
        // Format B: separate YAML lines (key: value) from body text
        const lines = chunk.split("\n");
        const yamlLines: string[] = [];
        const bodyLines: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "." || trimmed === "") continue; // skip terminators and blank lines
          if (/^[a-zA-Z_][\w-]*:/.test(trimmed)) {
            yamlLines.push(line);
          } else {
            bodyLines.push(line);
          }
        }

        matterStr = `---\n${yamlLines.join("\n")}\n---\n${bodyLines.join("\n")}`;
      }

      const { data, content } = matter(matterStr);

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
    } catch {
      // Skip malformed blocks silently
    }
  }

  return events.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
}
