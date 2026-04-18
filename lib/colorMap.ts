import { EventType } from "@/types";

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  war:       "#ef4444",
  discovery: "#22c55e",
  policy:    "#3b82f6",
  company:   "#f59e0b",
  crisis:    "#a855f7",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  war:       "Guerra / Conflito",
  discovery: "Descoberta",
  policy:    "Política / Embargo",
  company:   "Evento Corporativo",
  crisis:    "Crise Econômica",
};
