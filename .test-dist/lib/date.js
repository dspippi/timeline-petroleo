"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLocalDate = parseLocalDate;
exports.serializeLocalDate = serializeLocalDate;
const date_fns_1 = require("date-fns");
/** Parse "YYYY-MM-DD" as a local calendar date, avoiding UTC timezone shifts. */
function parseLocalDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
}
/** Serialize a Date as "YYYY-MM-DD" in local calendar terms. */
function serializeLocalDate(value) {
    return (0, date_fns_1.format)(value, "yyyy-MM-dd");
}
