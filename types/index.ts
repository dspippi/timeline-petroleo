// EventType is now an open string to support user-defined categories.
// The actual list of valid types is stored in data/categories.json.
export type EventType = string;

/** @deprecated Use listCategories() server-side or useCategories() client-side instead. */
export const EVENT_TYPES: readonly string[] = ["war", "discovery", "policy", "company", "crisis"];

export interface OilEvent {
  id: string;
  title: string;
  start_date: Date;
  end_date?: Date;
  country: string;
  region: string;
  type: EventType;
  company?: string;
  wikipedia?: string;
  description: string;
}

export type SerializedOilEvent = Omit<OilEvent, "start_date" | "end_date"> & {
  start_date: string;
  end_date: string | null;
};

export interface OilPrice {
  date: Date;
  price: number;
}

export interface FilterState {
  countries: Set<string>;
  types: Set<EventType>;
  companies: Set<string>;
}

export interface TimelineScale {
  toPixel: (date: Date) => number;
  toDate: (pixel: number) => Date;
  domainStart: Date;
  domainEnd: Date;
  totalWidthPx: number;
  pxPerDay: number;
}
