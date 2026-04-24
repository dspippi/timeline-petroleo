import test from "node:test";
import assert from "node:assert/strict";
import { buildScale, getDefaultDomain } from "../lib/timelineScale";

test("buildScale converts date <-> pixel with stable offsets", () => {
  const start = new Date(2020, 0, 1);
  const end = new Date(2020, 0, 11);
  const scale = buildScale(start, end, 2);
  const middle = new Date(2020, 0, 6);

  assert.equal(scale.totalWidthPx, 620);
  assert.equal(scale.toPixel(start), 300);
  assert.equal(scale.toPixel(middle), 310);
  assert.equal(scale.toDate(scale.toPixel(middle)).getTime(), middle.getTime());
});

test("getDefaultDomain returns a bounded domain for empty input", () => {
  const now = new Date();
  const [min, max] = getDefaultDomain([]);

  assert.equal(min.getFullYear(), now.getFullYear() - 10);
  assert.equal(min.getMonth(), 0);
  assert.equal(min.getDate(), 1);
  assert.equal(max.getFullYear(), now.getFullYear() + 4);
  assert.equal(max.getMonth(), 11);
  assert.equal(max.getDate(), 31);
});

test("getDefaultDomain pads event range and guarantees future headroom", () => {
  const now = new Date();
  const [min, max] = getDefaultDomain([
    { start_date: new Date(2010, 0, 1) },
    { start_date: new Date(2018, 6, 10), end_date: new Date(2021, 0, 1) },
  ]);

  assert.equal(min.getFullYear(), 2008);
  assert.ok(max.getFullYear() >= now.getFullYear() + 4);
});
