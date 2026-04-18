"use client";

import { memo, useMemo } from "react";
import { OilEvent, FilterState, EventType } from "@/types";
import { FilterChip } from "./FilterChip";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/colorMap";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

interface Props {
  allEvents: OilEvent[];
  filters: FilterState;
  onToggleCountry: (c: string) => void;
  onToggleType: (t: EventType) => void;
  onToggleCompany: (c: string) => void;
  onClearAll: () => void;
  activeCount: number;
}

export const FilterPanel = memo(function FilterPanel({
  allEvents,
  filters,
  onToggleCountry,
  onToggleType,
  onToggleCompany,
  onClearAll,
  activeCount,
}: Props) {
  const countries = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.country))).sort(),
    [allEvents]
  );

  const companies = useMemo(
    () =>
      Array.from(new Set(allEvents.map((e) => e.company).filter(Boolean) as string[])).sort(),
    [allEvents]
  );

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-w-0 pr-1">
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em]">
          Filtros
        </span>
        {activeCount > 0 && (
          <>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-amber-600 font-medium">
              {activeCount} ativo{activeCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={onClearAll}
              className="ml-auto text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              Limpar tudo
            </button>
          </>
        )}
      </div>

      {/* Event types */}
      <div>
        <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">Tipo</div>
        <div className="flex flex-wrap gap-1">
          {EVENT_TYPES.map((t) => (
            <FilterChip
              key={t}
              label={EVENT_TYPE_LABELS[t]}
              color={EVENT_TYPE_COLORS[t]}
              active={filters.types.has(t)}
              onClick={() => onToggleType(t)}
            />
          ))}
        </div>
      </div>

      {/* Countries */}
      <div>
        <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">País</div>
        <div className="flex flex-wrap gap-1">
          {countries.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={filters.countries.has(c)}
              onClick={() => onToggleCountry(c)}
            />
          ))}
        </div>
      </div>

      {companies.length > 0 && (
        <div>
          <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-1 font-semibold">Empresa</div>
          <div className="flex flex-wrap gap-1">
            {companies.map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={filters.companies.has(c)}
                onClick={() => onToggleCompany(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
