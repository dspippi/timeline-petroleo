import { format } from "date-fns";

/** Parse "YYYY-MM-DD" as a local calendar date, avoiding UTC timezone shifts. */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Serialize a Date as "YYYY-MM-DD" in local calendar terms. */
export function serializeLocalDate(value: Date): string {
  return format(value, "yyyy-MM-dd");
}
