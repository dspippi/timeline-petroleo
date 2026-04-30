"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
function loadModule() {
    const modulePath = require.resolve("../lib/basePath");
    delete require.cache[modulePath];
    return require(modulePath);
}
(0, node_test_1.default)("withBasePath uses empty prefix when env is missing", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    const mod = loadModule();
    strict_1.default.equal(mod.BASE_PATH, "");
    strict_1.default.equal(mod.withBasePath("/admin"), "/admin");
});
(0, node_test_1.default)("withBasePath normalizes prefix from env", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "timeline/";
    const mod = loadModule();
    strict_1.default.equal(mod.BASE_PATH, "/timeline");
    strict_1.default.equal(mod.withBasePath("/admin"), "/timeline/admin");
});
(0, node_test_1.default)('withBasePath throws when path does not start with "/"', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    const mod = loadModule();
    strict_1.default.throws(() => mod.withBasePath("admin"), /path must start with "\/"/);
});
