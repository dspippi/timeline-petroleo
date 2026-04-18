"use client";

import { useReducer, useCallback, useMemo } from "react";
import { FilterState, EventType, OilEvent } from "@/types";

type FilterAction =
  | { type: "TOGGLE_COUNTRY"; country: string }
  | { type: "TOGGLE_TYPE"; eventType: EventType }
  | { type: "TOGGLE_COMPANY"; company: string }
  | { type: "CLEAR_ALL" };

const initialState: FilterState = {
  countries: new Set(),
  types: new Set(),
  companies: new Set(),
};

function toggle<T>(set: Set<T>, item: T): Set<T> {
  const next = new Set(set);
  next.has(item) ? next.delete(item) : next.add(item);
  return next;
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "TOGGLE_COUNTRY":
      return { ...state, countries: toggle(state.countries, action.country) };
    case "TOGGLE_TYPE":
      return { ...state, types: toggle(state.types, action.eventType) };
    case "TOGGLE_COMPANY":
      return { ...state, companies: toggle(state.companies, action.company) };
    case "CLEAR_ALL":
      return initialState;
    default:
      return state;
  }
}

export function useFilters(allEvents: OilEvent[]) {
  const [filters, dispatch] = useReducer(filterReducer, initialState);

  const filteredEvents = useMemo(() => {
    const { countries, types, companies } = filters;
    if (countries.size === 0 && types.size === 0 && companies.size === 0) {
      return allEvents;
    }
    return allEvents.filter(
      (e) =>
        (countries.size === 0 || countries.has(e.country)) &&
        (types.size === 0 || types.has(e.type)) &&
        (companies.size === 0 || (!!e.company && companies.has(e.company)))
    );
  }, [allEvents, filters]);

  const toggleCountry = useCallback(
    (c: string) => dispatch({ type: "TOGGLE_COUNTRY", country: c }),
    []
  );
  const toggleType = useCallback(
    (t: EventType) => dispatch({ type: "TOGGLE_TYPE", eventType: t }),
    []
  );
  const toggleCompany = useCallback(
    (c: string) => dispatch({ type: "TOGGLE_COMPANY", company: c }),
    []
  );
  const clearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  const activeCount = filters.countries.size + filters.types.size + filters.companies.size;

  return { filters, filteredEvents, toggleCountry, toggleType, toggleCompany, clearAll, activeCount };
}
