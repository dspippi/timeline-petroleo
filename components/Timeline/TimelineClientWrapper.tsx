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
import { FilterPanel } from "@/components/Filters/FilterPanel";
import { WorldMap } from "@/components/WorldMap/WorldMap";
import { Timeline } from "@/components/Timeline/Timeline";
import { OilPriceChart } from "@/components/OilChart/OilPriceChart";
import { EventCard } from "@/components/EventCard/EventCard";
import { Toggle } from "@/components/ui/Toggle";

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

  const { pxPerDay, setPxPerDay } = useTimelineSync();
  const { settings } = useSettings();
  const [showChart, setShowChart] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<OilEvent | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  const { filters, filteredEvents, toggleCountry, toggleType, toggleCompany, clearAll, activeCount } =
    useFilters(allEvents);

  const { prices } = useOilPrices();

  const [domainStart, domainEnd] = useMemo(() => getDefaultDomain(allEvents), [allEvents]);
  const scale = useMemo(
    () => buildScale(domainStart, domainEnd, pxPerDay, allEvents, settings.compressionRatio),
    [domainStart, domainEnd, pxPerDay, allEvents, settings.compressionRatio]
  );

  // Fit zoom on first mount
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current || scale.totalWidthPx === 0) return;
    const containerWidth = timelineScrollRef.current?.clientWidth ?? 0;
    if (containerWidth > 0) {
      hasFit.current = true;
      setPxPerDay(clamp(pxPerDay * containerWidth / scale.totalWidthPx, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
    }
  }, [scale.totalWidthPx]); // eslint-disable-line react-hooks/exhaustive-deps

  const countriesWithEvents = useMemo(
    () => new Set(filteredEvents.map((e) => e.country)),
    [filteredEvents]
  );

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

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

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#f5f3ee]">

      {/* ── Controls: desktop always visible / mobile collapsible ── */}
      <div className="shrink-0 border-b border-black/[0.07] bg-white">

        {/* Mobile toggle row */}
        <div className="flex items-center gap-2 px-3 py-2 md:hidden">
          <button
            onClick={() => setControlsOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${controlsOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Mapa e Filtros
          </button>
          {activeCount > 0 && (
            <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
              {activeCount}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Toggle enabled={showChart} onChange={setShowChart} label="Brent" />
          </div>
        </div>

        {/* Collapsible panel — always open on desktop, toggleable on mobile */}
        <div className={`${controlsOpen ? "block" : "hidden"} md:block`}>
          <div className="flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
            {/* Map — hidden on small mobile, visible from sm up */}
            <div className="hidden sm:block shrink-0">
              <WorldMap
                countriesWithEvents={countriesWithEvents}
                activeCountries={filters.countries}
                onCountryClick={toggleCountry}
              />
            </div>
            <FilterPanel
              allEvents={allEvents}
              filters={filters}
              onToggleCountry={toggleCountry}
              onToggleType={toggleType}
              onToggleCompany={toggleCompany}
              onClearAll={clearAll}
              activeCount={activeCount}
            />
          </div>
        </div>
      </div>

      {/* ── Toolbar (desktop only — on mobile it's inside the toggle row) ── */}
      <div className="shrink-0 hidden md:flex items-center gap-4 px-4 py-2 border-b border-black/[0.07] bg-white/80">
        <Toggle enabled={showChart} onChange={setShowChart} label="Preço Brent (USD/barril)" />
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

      {/* Mobile event count bar */}
      <div className="shrink-0 flex items-center px-3 py-1 border-b border-black/[0.05] bg-white/60 md:hidden">
        <span className="text-[10px] text-gray-400">
          {filteredEvents.length}/{allEvents.length} eventos
        </span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="ml-auto text-[10px] text-amber-600 underline">
            limpar filtros
          </button>
        )}
      </div>

      {/* Chart */}
      {showChart && (
        <OilPriceChart
          prices={prices}
          scale={scale}
          scrollRef={chartScrollRef}
          onScroll={handleChartScroll}
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

      {/* ── Footer ── */}
      <footer className="shrink-0 border-t border-black/[0.07] bg-[#f5f3ee] px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wide">
            Desenvolvido por{" "}
            <span className="text-gray-600 font-bold">Diogo S. P. Calegari</span>
          </span>
          <span className="hidden sm:inline text-gray-300">·</span>
          <a
            href="mailto:timelinedopetroleo@gmail.com"
            className="hidden sm:inline text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
          >
            timelinedopetroleo@gmail.com
          </a>
        </div>
        <p className="text-[9.5px] text-gray-400 leading-relaxed sm:border-l sm:border-black/[0.08] sm:pl-4">
          Projeto pessoal e independente. Informações baseadas em fontes públicas e literatura especializada —
          podem conter imprecisões de cunho didático. O autor não se responsabiliza pelo uso das informações aqui apresentadas.
        </p>
      </footer>
    </div>
  );
}
