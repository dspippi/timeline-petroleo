"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { parseISO } from "date-fns";
import { OilEvent, SerializedOilEvent } from "@/types";
import { buildScale, getDefaultDomain, MIN_PX_PER_DAY, MAX_PX_PER_DAY } from "@/lib/timelineScale";
import { clamp } from "@/lib/utils";
import { useFilters } from "@/hooks/useFilters";
import { useOilPrices } from "@/hooks/useOilPrices";
import { usePxPerDay, useSetPxPerDay } from "@/context/TimelineSyncContext";
import { useSettings, useDarkMode } from "@/context/SettingsContext";
import { DEFAULT_PX_PER_DAY } from "@/lib/timelineScale";
import { FilterDropdown } from "@/components/Filters/FilterDropdown";
import { Timeline } from "@/components/Timeline/Timeline";
import { LABEL_WIDTH } from "@/components/Timeline/TimelineRows";
import { OilPriceChart } from "@/components/OilChart/OilPriceChart";
import { EventCard } from "@/components/EventCard/EventCard";
import { Toggle } from "@/components/ui/Toggle";
import { useCategories } from "@/context/CategoriesContext";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";

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
  const { settings, updateSettings } = useSettings();
  const darkMode = useDarkMode();
  const { categories } = useCategories();
  const [showChart, setShowChart] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<OilEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

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

  const scrollEndLimit = useMemo(() => new Date(2031, 11, 31), []);

  const getMaxAllowedScrollLeft = useCallback((el: HTMLDivElement) => {
    const contentWidth = scale.totalWidthPx + LABEL_WIDTH;
    const maxByContent = Math.max(0, contentWidth - el.clientWidth);

    const limitPlotPxRaw = scale.toPixel(scrollEndLimit);
    const limitPlotPx = clamp(limitPlotPxRaw, 0, scale.totalWidthPx);
    const limitContentPx = LABEL_WIDTH + limitPlotPx;
    const maxByLimit = Math.max(0, limitContentPx - el.clientWidth);

    return Math.min(maxByContent, maxByLimit);
  }, [scale, scrollEndLimit]);

  const clampScrollLeftPairInPlace = useCallback((primary: HTMLDivElement, secondary: HTMLDivElement) => {
    const maxAllowed = getMaxAllowedScrollLeft(primary);
    if (primary.scrollLeft <= maxAllowed) return false;
    primary.scrollLeft = maxAllowed;
    secondary.scrollLeft = maxAllowed;
    return true;
  }, [getMaxAllowedScrollLeft]);

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
        timelineScrollRef.current.scrollLeft = Math.min(
          timelineScrollRef.current.scrollWidth,
          getMaxAllowedScrollLeft(timelineScrollRef.current)
        );
      }
      if (chartScrollRef.current && timelineScrollRef.current) {
        chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
      }
      hasScrolled.current = true;
      requestAnimationFrame(() => setChartReady(true));
    });
  }, [scale.totalWidthPx, getMaxAllowedScrollLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // When chart prices arrive asynchronously, sync its scroll to the timeline.
  useEffect(() => {
    if (prices.length === 0 || !chartScrollRef.current || !timelineScrollRef.current) return;
    chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
  }, [prices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef    = useRef<HTMLDivElement>(null);
  const isSyncing         = useRef(false);
  const visibleRangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  const updateVisibleRange = useCallback(() => {
    const scrollEl = timelineScrollRef.current ?? chartScrollRef.current;
    if (!scrollEl || scale.totalWidthPx <= 0) return;

    const startPx = clamp(scrollEl.scrollLeft - LABEL_WIDTH, 0, scale.totalWidthPx);
    const endPx = clamp(scrollEl.scrollLeft + scrollEl.clientWidth - LABEL_WIDTH, startPx, scale.totalWidthPx);
    setVisibleRange({
      start: scale.toDate(startPx),
      end: scale.toDate(endPx),
    });
  }, [scale]);

  const scheduleVisibleRangeUpdate = useCallback((delay = 180) => {
    if (visibleRangeTimer.current !== null) clearTimeout(visibleRangeTimer.current);
    visibleRangeTimer.current = setTimeout(updateVisibleRange, delay);
  }, [updateVisibleRange]);

  useEffect(() => {
    scheduleVisibleRangeUpdate();
    return () => {
      if (visibleRangeTimer.current !== null) clearTimeout(visibleRangeTimer.current);
    };
  }, [prices.length, scale, scheduleVisibleRangeUpdate]);

  // Pure DOM scroll sync — no React state, no re-renders, runs every scroll frame.
  const handleTimelineScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    chartScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
    clampScrollLeftPairInPlace(timelineScrollRef.current, chartScrollRef.current);
    isSyncing.current = false;
    scheduleVisibleRangeUpdate();
  }, [scheduleVisibleRangeUpdate, clampScrollLeftPairInPlace]);

  const handleChartScroll = useCallback(() => {
    if (isSyncing.current || !timelineScrollRef.current || !chartScrollRef.current) return;
    isSyncing.current = true;
    timelineScrollRef.current.scrollLeft = chartScrollRef.current.scrollLeft;
    clampScrollLeftPairInPlace(chartScrollRef.current, timelineScrollRef.current);
    isSyncing.current = false;
    scheduleVisibleRangeUpdate();
  }, [scheduleVisibleRangeUpdate, clampScrollLeftPairInPlace]);

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

  const zoomIn = useCallback(() => {
    setPxPerDay(clamp(pxPerDay * 1.4, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
  }, [pxPerDay, setPxPerDay]);

  const zoomOut = useCallback(() => {
    setPxPerDay(clamp(pxPerDay / 1.4, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
  }, [pxPerDay, setPxPerDay]);

  const zoomReset = useCallback(() => {
    setPxPerDay(DEFAULT_PX_PER_DAY);
  }, [setPxPerDay]);

  const zoomFit = useCallback(() => {
    const containerWidth = timelineScrollRef.current?.clientWidth ?? 800;
    const plotWidth = containerWidth - LABEL_WIDTH;
    const fitPxPerDay = pxPerDay * plotWidth / scale.totalWidthPx;
    setPxPerDay(clamp(fitPxPerDay, MIN_PX_PER_DAY, MAX_PX_PER_DAY));
  }, [pxPerDay, scale.totalWidthPx, setPxPerDay]);

  const zoomPercent = Math.round((pxPerDay / DEFAULT_PX_PER_DAY) * 100);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-app">

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-line bg-surface">
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
        <div className="w-px h-4 bg-surface-alt mx-1 hidden sm:block" />

        {/* Brent toggle */}
        <Toggle enabled={showChart} onChange={setShowChart} label="Preço Brent (USD/barril)" />

        <div className="w-px h-4 bg-surface-alt mx-1 hidden md:block" />

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-content-tertiary uppercase tracking-wider font-medium mr-1">Zoom</span>
          <button
            onClick={zoomOut}
            disabled={pxPerDay <= MIN_PX_PER_DAY}
            className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-content-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Reduzir zoom"
          >
            −
          </button>
          <button
            onClick={zoomReset}
            className="px-2 h-6 text-[10px] font-mono text-content-secondary hover:bg-surface-hover rounded transition-colors min-w-[42px] text-center"
            title="Resetar zoom"
          >
            {zoomPercent}%
          </button>
          <button
            onClick={zoomIn}
            disabled={pxPerDay >= MAX_PX_PER_DAY}
            className="w-6 h-6 flex items-center justify-center rounded text-sm font-bold text-content-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Aumentar zoom"
          >
            +
          </button>
          <button
            onClick={zoomFit}
            className="px-2 h-6 text-[10px] text-content-secondary hover:bg-surface-hover rounded transition-colors"
            title="Ajustar toda a timeline à tela"
          >
            Fit
          </button>
        </div>

        <span className="text-[9px] text-content-muted hidden xl:block">Ctrl+Scroll para zoom · Arraste para navegar</span>

        {/* Event count + clear */}
        <span className="text-[11px] text-content-tertiary ml-auto">
          {filteredEvents.length} de {allEvents.length} eventos
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="ml-2 text-brand hover:text-brand-hover underline transition-colors"
            >
              limpar filtros
            </button>
          )}
        </span>

        <div className="relative">
          <button
            ref={settingsBtnRef}
            onClick={() => setSettingsOpen((o) => !o)}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
              settingsOpen ? "bg-brand-bg text-brand dark:shadow-brand-glow" : "text-gray-400 hover:text-gray-700 dark:text-[#8896a8] dark:hover:text-[#b7ff00] hover:bg-surface-hover"
            }`}
            title="Configurações"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <SettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            anchorRef={settingsBtnRef}
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => updateSettings({ darkMode: !darkMode })}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:text-[#8896a8] dark:hover:text-[#b7ff00] hover:bg-surface-hover transition-all"
          title={darkMode ? "Modo claro" : "Modo noturno"}
        >
          {darkMode ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Chart */}
      {showChart && (
        <div style={{ opacity: chartReady ? 1 : 0, transition: "opacity 0.12s" }}>
          <OilPriceChart
            prices={prices}
            scale={scale}
            scrollRef={chartScrollRef}
            onScroll={handleChartScroll}
            visibleRange={visibleRange}
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
