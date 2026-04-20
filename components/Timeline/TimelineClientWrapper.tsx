"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { parseISO } from "date-fns";
import { OilEvent, SerializedOilEvent } from "@/types";
import { buildScale, getDefaultDomain, MIN_PX_PER_DAY, MAX_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { useFilters } from "@/hooks/useFilters";
import { useOilPrices } from "@/hooks/useOilPrices";
import { usePxPerDay, useSetPxPerDay } from "@/context/TimelineSyncContext";
import { useSettings } from "@/context/SettingsContext";
import { FilterDropdown } from "@/components/Filters/FilterDropdown";
import { Timeline } from "@/components/Timeline/Timeline";
import { LABEL_WIDTH } from "@/components/Timeline/TimelineRows";
import { OilPriceChart } from "@/components/OilChart/OilPriceChart";
import { EventCard } from "@/components/EventCard/EventCard";
import { Toggle } from "@/components/ui/Toggle";
import { useCategories } from "@/context/CategoriesContext";

interface Props {
  serializedEvents: SerializedOilEvent[];
}

export function TimelineClientWrapper({ serializedEvents }: Props) {
  const allEvents = useMemo<OilEvent[]>(
    () =>
      serializedEvents.map((e) => ({
        ...e,
        start_date: parseISO(e.start_date),
        end_date: e.end_date ? parseISO(e.end_date) : undefined,
      })),
    [serializedEvents]
  );

  const pxPerDay    = usePxPerDay();
  const setPxPerDay = useSetPxPerDay();
  const { settings } = useSettings();
  const { categories } = useCategories();
  const [showChart, setShowChart] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<OilEvent | null>(null);

  const {
    filters,
    filteredEvents,
    toggleCountry,
    toggleType,
    toggleCompany,
    clearAll,
    clearTypes,
    clearCountries,
    clearCompanies,
    activeCount,
  } = useFilters(allEvents);

  const { prices } = useOilPrices();

  const [domainStart, domainEnd] = useMemo(() => getDefaultDomain(allEvents), [allEvents]);
  const scale = useMemo(
    () => buildScale(domainStart, domainEnd, pxPerDay),
    [domainStart, domainEnd, pxPerDay]
  );

  const hasFit = useRef(false);
  const hasScrolled = useRef(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (scale.totalWidthPx === 0) return;
    if (!hasFit.current) {
      const containerWidth = timelineScrollRef.current?.clientWidth ?? 0;
      if (containerWidth > 0) {
        hasFit.current = true;
        setPxPerDay(clamp(pxPerDay * (containerWidth - LABEL_WIDTH) / scale.totalWidthPx, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
      }
      return;
    }
    if (hasScrolled.current) return;
    requestAnimationFrame(() => {
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollLeft = timelineScrollRef.current.scrollWidth;
      }
      if (chartScrollRef.current && timelineScrollRef.current) {
        chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
      }
      hasScrolled.current = true;
      requestAnimationFrame(() => setChartReady(true));
    });
  }, [scale.totalWidthPx]); // eslint-disable-line react-hooks/exhaustive-deps

  // When chart prices arrive asynchronously, sync its scroll to the timeline.
  useEffect(() => {
    if (prices.length === 0 || !chartScrollRef.current || !timelineScrollRef.current) return;
    chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
  }, [prices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef    = useRef<HTMLDivElement>(null);
  const isSyncing         = useRef(false);

  // Pure DOM scroll sync — no React state, no re-renders, runs every scroll frame.
  const handleTimelineScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
    isSyncing.current = false;
  }, []);

  const handleChartScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    timelineScrollRef.current.scrollLeft = chartScrollRef.current.scrollLeft;
    isSyncing.current = false;
  }, []);

  const countries = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.country))).sort(),
    [allEvents]
  );

  const companies = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.company).filter(Boolean) as string[])).sort(),
    [allEvents]
  );

  const typeOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.label,
    color: cat.color,
  }));

  const countryOptions = countries.map((c) => ({ value: c, label: c }));
  const companyOptions = companies.map((c) => ({ value: c, label: c }));

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#f5f3ee]">

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-black/[0.07] bg-white">
        {/* Filter dropdowns */}
        <FilterDropdown
          label="Tipo"
          options={typeOptions}
          selected={filters.types as Set<string>}
          onToggle={toggleType as (v: string) => void}
          onClear={clearTypes}
        />
        <FilterDropdown
          label="País"
          options={countryOptions}
          selected={filters.countries}
          onToggle={toggleCountry}
          onClear={clearCountries}
        />
        {companyOptions.length > 0 && (
          <FilterDropdown
            label="Empresa"
            options={companyOptions}
            selected={filters.companies}
            onToggle={toggleCompany}
            onClear={clearCompanies}
          />
        )}

        {/* Separator */}
        <div className="w-px h-4 bg-gray-200 mx-1 hidden sm:block" />

        {/* Brent toggle */}
        <Toggle enabled={showChart} onChange={setShowChart} label="Preço Brent (USD/barril)" />

        {/* Event count + clear */}
        <span className="text-[11px] text-gray-400 ml-auto">
          {filteredEvents.length} de {allEvents.length} eventos
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="ml-2 text-amber-600 hover:text-amber-800 underline transition-colors"
            >
              limpar filtros
            </button>
          )}
        </span>
      </div>

      {/* Chart */}
      {showChart && (
        <div style={{ opacity: chartReady ? 1 : 0, transition: "opacity 0.12s" }}>
          <OilPriceChart
            prices={prices}
            scale={scale}
            scrollRef={chartScrollRef}
            onScroll={handleChartScroll}
          />
        </div>
      )}

      {/* Timeline */}
      <Timeline
        events={filteredEvents}
        scale={scale}
        scrollRef={timelineScrollRef}
        onScroll={handleTimelineScroll}
        onEventClick={setSelectedEvent}
        onTypeFilter={toggleType}
      />

      <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
