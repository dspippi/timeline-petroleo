/**
 * Static fallback maps — kept for backward compatibility with any code that
 * still imports these directly.  Prefer useCategories() in client components
 * and listCategories() in server components.
 *
 * @deprecated Use useCategories() or listCategories() instead.
 * These values may be out of sync with data/categories.json.
 */

import { listCategories } from "./categories";

let _cached: { colors: Record<string, string>; labels: Record<string, string> } | null = null;

function load() {
  if (_cached) return _cached;
  try {
    const cats = listCategories();
    _cached = {
      colors: Object.fromEntries(cats.map((c) => [c.id, c.color])),
      labels: Object.fromEntries(cats.map((c) => [c.id, c.label])),
    };
  } catch {
    _cached = { colors: {}, labels: {} };
  }
  return _cached;
}

/** @deprecated Use useCategories().getColor() instead */
export const EVENT_TYPE_COLORS: Record<string, string> = new Proxy({}, {
  get: (_, key: string) => load().colors[key] ?? "#6b7280",
});

/** @deprecated Use useCategories().getLabel() instead */
export const EVENT_TYPE_LABELS: Record<string, string> = new Proxy({}, {
  get: (_, key: string) => load().labels[key] ?? key,
});
