"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { parseISO } from "date-fns";
import { OilEvent, SerializedOilEvent } from "@/types";
import { buildScale, getDefaultDomain, MIN_PX_PER_DAY, MAX_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { useFilters } from "@/hooks/useFilters";
import { useOilPrices } from "@/hooks/useOilPrices";
import { useTimelineSync } from "@/context/TimelineSyncContext";
import { useSettings } from "@/context/SettingsContext";
import { FilterDropdown } from "@/components/Filters/FilterDropdown";
import { Timeline } from "@/components/Timeline/Timeline";
import { LABEL_WIDTH } from "@/components/Timeline/TimelineRows";
import { OilPriceChart } from "@/components/OilChart/OilPriceChart";
import { EventCard } from "@/components/EventCard/EventCard";
import { Toggle } from "@/components/ui/Toggle";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/colorMap";
import { EventType } from "@/types";

interface Props {
  serializedEvents: SerializedOilEvent[];
}

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

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

  const { pxPerDay, setPxPerDay } = useTimelineSync();
  const { settings } = useSettings();
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
  useEffect(() => {
    if (hasFit.current || scale.totalWidthPx === 0) return;
    const containerWidth = timelineScrollRef.current?.clientWidth ?? 0;
    if (containerWidth > 0) {
      hasFit.current = true;
      setPxPerDay(clamp(pxPerDay * (containerWidth - LABEL_WIDTH) / scale.totalWidthPx, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
    }
  }, [scale.totalWidthPx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasScrolled.current || !hasFit.current || scale.totalWidthPx === 0) return;
    requestAnimationFrame(() => {
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollLeft = timelineScrollRef.current.scrollWidth;
      }
      if (chartScrollRef.current && timelineScrollRef.current) {
        chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
      }
      setChartScrollLeft(timelineScrollRef.current?.scrollLeft ?? 0);
      hasScrolled.current = true;
    });
  }, [scale.totalWidthPx]); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
  const [chartScrollLeft, setChartScrollLeft] = useState(0);

  const handleTimelineScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    const sl = timelineScrollRef.current.scrollLeft;
    chartScrollRef.current.scrollLeft = sl;
    setChartScrollLeft(sl);
    isSyncing.current = false;
  }, []);

  const handleChartScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    const sl = chartScrollRef.current.scrollLeft;
    timelineScrollRef.current.scrollLeft = sl;
    setChartScrollLeft(sl);
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

  const typeOptions = EVENT_TYPES.map((t) => ({
    value: t,
    label: EVENT_TYPE_LABELS[t],
    color: EVENT_TYPE_COLORS[t],
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
        <OilPriceChart
          prices={prices}
          scale={scale}
          scrollRef={chartScrollRef}
          onScroll={handleChartScroll}
          chartScrollLeft={chartScrollLeft}
        />
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
