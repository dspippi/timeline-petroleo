"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const timelineScale_1 = require("../lib/timelineScale");
(0, node_test_1.default)("buildScale converts date <-> pixel with stable offsets", () => {
    const start = new Date(2020, 0, 1);
    const end = new Date(2020, 0, 11);
    const scale = (0, timelineScale_1.buildScale)(start, end, 2);
    const middle = new Date(2020, 0, 6);
    strict_1.default.equal(scale.totalWidthPx, 620);
    strict_1.default.equal(scale.toPixel(start), 300);
    strict_1.default.equal(scale.toPixel(middle), 310);
    strict_1.default.equal(scale.toDate(scale.toPixel(middle)).getTime(), middle.getTime());
});
(0, node_test_1.default)("getDefaultDomain returns a bounded domain for empty input", () => {
    const now = new Date();
    const [min, max] = (0, timelineScale_1.getDefaultDomain)([]);
    strict_1.default.equal(min.getFullYear(), now.getFullYear() - 10);
    strict_1.default.equal(min.getMonth(), 0);
    strict_1.default.equal(min.getDate(), 1);
    strict_1.default.equal(max.getFullYear(), now.getFullYear() + 4);
    strict_1.default.equal(max.getMonth(), 11);
    strict_1.default.equal(max.getDate(), 31);
});
(0, node_test_1.default)("getDefaultDomain pads event range and guarantees future headroom", () => {
    const now = new Date();
    const [min, max] = (0, timelineScale_1.getDefaultDomain)([
        { start_date: new Date(2010, 0, 1) },
        { start_date: new Date(2018, 6, 10), end_date: new Date(2021, 0, 1) },
    ]);
    strict_1.default.equal(min.getFullYear(), 2008);
    strict_1.default.ok(max.getFullYear() >= now.getFullYear() + 4);
});
