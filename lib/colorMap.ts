/**
 * Static fallback maps — kept for backward compatibility with any code that
 * still imports these directly.  Prefer useCategories() in client components
 * and listCategories() in server components.
 */

export const EVENT_TYPE_COLORS: Record<string, string> = {
  war:       "#ef4444",
  discovery: "#22c55e",
  policy:    "#3b82f6",
  company:   "#f59e0b",
  crisis:    "#a855f7",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  war:       "Guerra / Conflito",
  discovery: "Descoberta",
  policy:    "Política / Embargo",
  company:   "Evento Corporativo",
  crisis:    "Crise Econômica",
};
