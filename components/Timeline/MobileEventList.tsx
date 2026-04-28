"use client";

import { getYear } from "date-fns";
import { OilEvent } from "@/types";
import { formatEventDate, isBrasil } from "@/lib/utils";
import { useCategories } from "@/context/CategoriesContext";

interface Props {
  events: OilEvent[];
  onEventClick: (event: OilEvent) => void;
}

export function MobileEventList({ events, onEventClick }: Props) {
  const { getColor, getLabel } = useCategories();

  const sortedEvents = [...events].sort(
    (a, b) => b.start_date.getTime() - a.start_date.getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-content-muted">
        Nenhum evento corresponde aos filtros selecionados.
      </div>
    );
  }

  let currentYear: number | null = null;

  return (
    <div className="flex-1 overflow-y-auto bg-app px-3 pb-6 pt-3">
      <div className="mb-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-panel">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-tertiary">
          Modo celular
        </p>
        <h1 className="mt-1 text-base font-bold text-content-primary">
          Timeline em lista cronológica
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-content-tertiary">
          Use os filtros acima e toque em um evento para abrir os detalhes.
        </p>
      </div>

      <div className="relative pl-5">
        <div className="absolute bottom-2 left-[10px] top-2 w-px bg-line-strong" />

        {sortedEvents.map((event) => {
          const year = getYear(event.start_date);
          const showYear = year !== currentYear;
          currentYear = year;
          const color = getColor(event.type);
          const brasil = isBrasil(event.country);

          return (
            <div key={event.id}>
              {showYear && (
                <div className="sticky top-0 z-10 -ml-5 mb-2 mt-4 flex items-center gap-2 bg-app py-1">
                  <span className="rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-[11px] font-bold text-content-secondary shadow-sm">
                    {year}
                  </span>
                  <div className="h-px flex-1 bg-line" />
                </div>
              )}

              <button
                type="button"
                onClick={() => onEventClick(event)}
                className={`group relative mb-3 w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                  brasil
                    ? "border-brand bg-brand-bg shadow-[0_10px_30px_rgba(245,158,11,0.10)] dark:shadow-brand-glow"
                    : "border-line bg-surface shadow-sm hover:border-line-strong hover:bg-surface-hover"
                }`}
              >
                <span
                  className="absolute -left-[17px] top-5 h-3.5 w-3.5 rounded-full border-2 border-app"
                  style={{ backgroundColor: color }}
                />

                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${color}18`,
                      border: `1px solid ${color}44`,
                      color,
                    }}
                  >
                    {getLabel(event.type)}
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-content-tertiary">
                    {event.region}
                  </span>
                </div>

                <h2
                  className={`text-sm font-bold leading-snug ${
                    brasil ? "text-brand-hover" : "text-content-primary"
                  }`}
                >
                  {event.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-content-tertiary">
                  <span className="font-mono">{formatEventDate(event.start_date, event.end_date)}</span>
                  <span className="h-3 w-px bg-line-strong" />
                  <span className={brasil ? "font-semibold text-brand-hover" : ""}>
                    {event.country}
                  </span>
                  {event.company && (
                    <>
                      <span className="h-3 w-px bg-line-strong" />
                      <span className="truncate">{event.company}</span>
                    </>
                  )}
                </div>

                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-content-secondary">
                  {event.description}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
