"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSources = listSources;
exports.saveSources = saveSources;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SOURCES_FILE = path_1.default.join(process.cwd(), "data", "sources.json");
function listSources() {
    try {
        const data = fs_1.default.readFileSync(SOURCES_FILE, "utf-8");
        return JSON.parse(data);
    }
    catch (e) {
        console.error("Failed to read sources:", e);
        return [];
    }
}
function saveSources(sources) {
    if (process.env.VERCEL === "1") {
        console.warn("Cannot save in Vercel environment");
        return;
    }
    fs_1.default.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
}
