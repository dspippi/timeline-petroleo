"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const date_1 = require("../lib/date");
(0, node_test_1.default)("parseLocalDate preserves the calendar date without UTC shifting", () => {
    const date = (0, date_1.parseLocalDate)("1854-12-30");
    strict_1.default.equal(date.getFullYear(), 1854);
    strict_1.default.equal(date.getMonth(), 11);
    strict_1.default.equal(date.getDate(), 30);
});
(0, node_test_1.default)("serializeLocalDate emits a stable YYYY-MM-DD string", () => {
    const date = new Date(1854, 11, 30);
    strict_1.default.equal((0, date_1.serializeLocalDate)(date), "1854-12-30");
});
