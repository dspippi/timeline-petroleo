"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CATEGORIES = void 0;
exports.listCategories = listCategories;
exports.saveCategories = saveCategories;
/**
 * Server-only helpers for reading and writing data/categories.json.
 * Never import this in client components.
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CATEGORIES_PATH = path_1.default.join(process.cwd(), "data", "categories.json");
exports.DEFAULT_CATEGORIES = [
    { id: "war", label: "Guerra / Conflito", color: "#ef4444" },
    { id: "discovery", label: "Descoberta", color: "#22c55e" },
    { id: "policy", label: "Política / Embargo", color: "#3b82f6" },
    { id: "company", label: "Evento Corporativo", color: "#f59e0b" },
    { id: "crisis", label: "Crise Econômica", color: "#a855f7" },
];
function listCategories() {
    try {
        return JSON.parse(fs_1.default.readFileSync(CATEGORIES_PATH, "utf-8"));
    }
    catch {
        return exports.DEFAULT_CATEGORIES;
    }
}
function saveCategories(categories) {
    fs_1.default.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf-8");
}
