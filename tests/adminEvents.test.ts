import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type AdminEventsModule = typeof import("../lib/adminEvents");

function mkWorkspace(initialEvents: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-admin-events-"));
  fs.mkdirSync(path.join(dir, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "data", "events.json"),
    JSON.stringify(initialEvents, null, 2),
    "utf-8"
  );
  return dir;
}

function loadModule(): AdminEventsModule {
  const modulePath = require.resolve("../lib/adminEvents");
  delete require.cache[modulePath];
  return require(modulePath) as AdminEventsModule;
}

function readStoredEvents(workspace: string) {
  return JSON.parse(
    fs.readFileSync(path.join(workspace, "data", "events.json"), "utf-8")
  ) as Array<{ id: string; start_date: string; title: string }>;
}

test("listEvents parses valid rows, skips invalid rows and sorts by date", () => {
  const originalCwd = process.cwd();
  const workspace = mkWorkspace([
    {
      id: "late",
      title: "Late",
      start_date: "2021-01-10",
      end_date: null,
      country: null,
      region: null,
      type: "policy",
      company: null,
      wikipedia: null,
      description: "x",
    },
    {
      id: "invalid",
      title: "",
      start_date: "not-a-date",
      end_date: null,
      country: "BR",
      region: "Global",
      type: "policy",
      company: null,
      wikipedia: null,
      description: "",
    },
    {
      id: "early",
      title: "Early",
      start_date: "2020-03-01",
      end_date: "2020-03-05",
      country: "Brasil",
      region: "América do Sul",
      type: "company",
      company: "Petrobras",
      wikipedia: "https://example.test",
      description: "ok",
    },
  ]);

  try {
    process.chdir(workspace);
    const mod = loadModule();
    const events = mod.listEvents();

    assert.deepEqual(
      events.map((e) => e.id),
      ["early", "late"]
    );
    assert.equal(events[1].country, "Unknown");
    assert.equal(events[1].region, "Other");
    assert.equal(events[1].company, undefined);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("addEvent, updateEvent and deleteEvent persist consistent data", () => {
  const originalCwd = process.cwd();
  const workspace = mkWorkspace([
    {
      id: "b",
      title: "B",
      start_date: "2020-01-10",
      end_date: null,
      country: "Brasil",
      region: "América do Sul",
      type: "policy",
      company: null,
      wikipedia: null,
      description: "b",
    },
  ]);

  try {
    process.chdir(workspace);
    const mod = loadModule();

    mod.addEvent({
      id: "a",
      title: " A ",
      start_date: "2020-01-01",
      country: "Brasil",
      region: "América do Sul",
      type: "company",
      description: "  texto  ",
    });
    assert.throws(
      () =>
        mod.addEvent({
          id: "a",
          title: "Duplicado",
          start_date: "2020-01-20",
          country: "Brasil",
          region: "América do Sul",
          type: "company",
          description: "dup",
        }),
      /already exists/
    );

    mod.updateEvent("a", {
      id: "a",
      title: "A editado",
      start_date: "2019-12-31",
      end_date: "2020-01-02",
      country: "Brasil",
      region: "América do Sul",
      type: "policy",
      company: "Petrobras",
      wikipedia: "https://example.test",
      description: "final",
    });

    const afterUpdate = readStoredEvents(workspace);
    assert.deepEqual(
      afterUpdate.map((e) => e.id),
      ["a", "b"]
    );
    assert.equal(afterUpdate[0].title, "A editado");

    mod.deleteEvent("b");
    assert.throws(() => mod.deleteEvent("missing"), /not found/);

    const afterDelete = readStoredEvents(workspace);
    assert.deepEqual(
      afterDelete.map((e) => e.id),
      ["a"]
    );
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test("writeRawEvents validates JSON before saving", () => {
  const originalCwd = process.cwd();
  const workspace = mkWorkspace([]);

  try {
    process.chdir(workspace);
    const mod = loadModule();
    assert.throws(() => mod.writeRawEvents("{"), SyntaxError);
    mod.writeRawEvents("[]");
    assert.equal(fs.readFileSync(path.join(workspace, "data", "events.json"), "utf-8"), "[]");
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
