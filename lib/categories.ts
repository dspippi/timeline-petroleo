/**
 * Server-only helpers for reading and writing data/categories.json.
 * Never import this in client components.
 */
import fs from "fs";
import path from "path";

export interface Category {
  id: string;
  label: string;
  color: string;
}

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "war",       label: "Guerra / Conflito",   color: "#ef4444" },
  { id: "discovery", label: "Descoberta",           color: "#22c55e" },
  { id: "policy",    label: "Política / Embargo",   color: "#3b82f6" },
  { id: "company",   label: "Evento Corporativo",   color: "#f59e0b" },
  { id: "crisis",    label: "Crise Econômica",      color: "#a855f7" },
];

export function listCategories(): Category[] {
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf-8"));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf-8");
}
