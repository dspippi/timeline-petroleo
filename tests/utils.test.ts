import test from "node:test";
import assert from "node:assert/strict";
import { clamp, groupEventsByRegion, isBrasil } from "../lib/utils";
import type { OilEvent } from "../types";

function event(partial: Partial<OilEvent>): OilEvent {
  return {
    id: partial.id ?? "id",
    title: partial.title ?? "title",
    start_date: partial.start_date ?? new Date(2020, 0, 1),
    country: partial.country ?? "Unknown",
    region: partial.region ?? "Outros",
    type: partial.type ?? "policy",
    description: partial.description ?? "",
    end_date: partial.end_date,
    company: partial.company,
    wikipedia: partial.wikipedia,
  };
}

test("isBrasil handles case and spaces", () => {
  assert.equal(isBrasil(" Brasil "), true);
  assert.equal(isBrasil("brazil"), true);
  assert.equal(isBrasil("Argentina"), false);
});

test("groupEventsByRegion prioritizes region and country ordering rules", () => {
  const grouped = groupEventsByRegion([
    event({ id: "1", region: "Europa", country: "France" }),
    event({ id: "2", region: "Global", country: "United States" }),
    event({ id: "3", region: "Europa", country: "Germany" }),
    event({ id: "4", region: "Europa", country: "Brazil" }),
    event({ id: "5", region: "Europa", country: "France" }),
    event({ id: "6", region: "Regiao Nova", country: "X" }),
  ]);

  const regionOrder = Array.from(grouped.keys());
  assert.deepEqual(regionOrder.slice(0, 3), ["Global", "Europa", "Regiao Nova"]);

  const europeCountries = Array.from(grouped.get("Europa")!.keys());
  assert.deepEqual(europeCountries, ["Brazil", "France", "Germany"]);
});

test("clamp limits values to boundaries", () => {
  assert.equal(clamp(10, 0, 5), 5);
  assert.equal(clamp(-1, 0, 5), 0);
  assert.equal(clamp(3, 0, 5), 3);
});
