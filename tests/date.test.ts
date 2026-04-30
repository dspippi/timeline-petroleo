import test from "node:test";
import assert from "node:assert/strict";
import { parseLocalDate, serializeLocalDate } from "../lib/date";

test("parseLocalDate preserves the calendar date without UTC shifting", () => {
  const date = parseLocalDate("1854-12-30");

  assert.equal(date.getFullYear(), 1854);
  assert.equal(date.getMonth(), 11);
  assert.equal(date.getDate(), 30);
});

test("serializeLocalDate emits a stable YYYY-MM-DD string", () => {
  const date = new Date(1854, 11, 30);

  assert.equal(serializeLocalDate(date), "1854-12-30");
});
