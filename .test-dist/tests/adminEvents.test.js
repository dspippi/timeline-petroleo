"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
function mkWorkspace(initialEvents) {
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "timeline-admin-events-"));
    node_fs_1.default.mkdirSync(node_path_1.default.join(dir, "data"), { recursive: true });
    node_fs_1.default.writeFileSync(node_path_1.default.join(dir, "data", "events.json"), JSON.stringify(initialEvents, null, 2), "utf-8");
    return dir;
}
function loadModule() {
    const modulePath = require.resolve("../lib/adminEvents");
    delete require.cache[modulePath];
    return require(modulePath);
}
function readStoredEvents(workspace) {
    return JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(workspace, "data", "events.json"), "utf-8"));
}
(0, node_test_1.default)("listEvents parses valid rows, skips invalid rows and sorts by date", () => {
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
        strict_1.default.deepEqual(events.map((e) => e.id), ["early", "late"]);
        strict_1.default.equal(events[1].country, "Unknown");
        strict_1.default.equal(events[1].region, "Other");
        strict_1.default.equal(events[1].company, undefined);
    }
    finally {
        process.chdir(originalCwd);
        node_fs_1.default.rmSync(workspace, { recursive: true, force: true });
    }
});
(0, node_test_1.default)("addEvent, updateEvent and deleteEvent persist consistent data", () => {
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
        strict_1.default.throws(() => mod.addEvent({
            id: "a",
            title: "Duplicado",
            start_date: "2020-01-20",
            country: "Brasil",
            region: "América do Sul",
            type: "company",
            description: "dup",
        }), /already exists/);
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
        strict_1.default.deepEqual(afterUpdate.map((e) => e.id), ["a", "b"]);
        strict_1.default.equal(afterUpdate[0].title, "A editado");
        mod.deleteEvent("b");
        strict_1.default.throws(() => mod.deleteEvent("missing"), /not found/);
        const afterDelete = readStoredEvents(workspace);
        strict_1.default.deepEqual(afterDelete.map((e) => e.id), ["a"]);
    }
    finally {
        process.chdir(originalCwd);
        node_fs_1.default.rmSync(workspace, { recursive: true, force: true });
    }
});
(0, node_test_1.default)("writeRawEvents validates JSON before saving", () => {
    const originalCwd = process.cwd();
    const workspace = mkWorkspace([]);
    try {
        process.chdir(workspace);
        const mod = loadModule();
        strict_1.default.throws(() => mod.writeRawEvents("{"), SyntaxError);
        mod.writeRawEvents("[]");
        strict_1.default.equal(node_fs_1.default.readFileSync(node_path_1.default.join(workspace, "data", "events.json"), "utf-8"), "[]");
    }
    finally {
        process.chdir(originalCwd);
        node_fs_1.default.rmSync(workspace, { recursive: true, force: true });
    }
});
