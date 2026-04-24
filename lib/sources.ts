import fs from "fs";
import path from "path";

export type Source = {
  id: string;
  title: string;
  author: string;
  year: number;
  type: string;
  url?: string;
  imageUrl?: string;
  description: string;
};

const SOURCES_FILE = path.join(process.cwd(), "data", "sources.json");

export function listSources(): Source[] {
  try {
    const data = fs.readFileSync(SOURCES_FILE, "utf-8");
    return JSON.parse(data) as Source[];
  } catch (e) {
    console.error("Failed to read sources:", e);
    return [];
  }
}

export function saveSources(sources: Source[]) {
  if (process.env.VERCEL === "1") {
    console.warn("Cannot save in Vercel environment");
    return;
  }
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
}
