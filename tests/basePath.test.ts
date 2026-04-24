import test from "node:test";
import assert from "node:assert/strict";

function loadModule() {
  const modulePath = require.resolve("../lib/basePath");
  delete require.cache[modulePath];
  return require(modulePath) as typeof import("../lib/basePath");
}

test("withBasePath uses empty prefix when env is missing", () => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
  const mod = loadModule();

  assert.equal(mod.BASE_PATH, "");
  assert.equal(mod.withBasePath("/admin"), "/admin");
});

test("withBasePath normalizes prefix from env", () => {
  process.env.NEXT_PUBLIC_BASE_PATH = "timeline/";
  const mod = loadModule();

  assert.equal(mod.BASE_PATH, "/timeline");
  assert.equal(mod.withBasePath("/admin"), "/timeline/admin");
});

test('withBasePath throws when path does not start with "/"', () => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
  const mod = loadModule();

  assert.throws(() => mod.withBasePath("admin"), /path must start with "\/"/);
});
