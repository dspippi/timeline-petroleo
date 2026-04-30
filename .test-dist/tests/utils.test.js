"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const utils_1 = require("../lib/utils");
function event(partial) {
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
(0, node_test_1.default)("isBrasil handles case and spaces", () => {
    strict_1.default.equal((0, utils_1.isBrasil)(" Brasil "), true);
    strict_1.default.equal((0, utils_1.isBrasil)("brazil"), true);
    strict_1.default.equal((0, utils_1.isBrasil)("Argentina"), false);
});
(0, node_test_1.default)("groupEventsByRegion prioritizes region and country ordering rules", () => {
    const grouped = (0, utils_1.groupEventsByRegion)([
        event({ id: "1", region: "Europa", country: "France" }),
        event({ id: "2", region: "Global", country: "United States" }),
        event({ id: "3", region: "Europa", country: "Germany" }),
        event({ id: "4", region: "Europa", country: "Brazil" }),
        event({ id: "5", region: "Europa", country: "France" }),
        event({ id: "6", region: "Regiao Nova", country: "X" }),
    ]);
    const regionOrder = Array.from(grouped.keys());
    strict_1.default.deepEqual(regionOrder.slice(0, 3), ["Global", "Europa", "Regiao Nova"]);
    const europeCountries = Array.from(grouped.get("Europa").keys());
    strict_1.default.deepEqual(europeCountries, ["Brazil", "France", "Germany"]);
});
(0, node_test_1.default)("clamp limits values to boundaries", () => {
    strict_1.default.equal((0, utils_1.clamp)(10, 0, 5), 5);
    strict_1.default.equal((0, utils_1.clamp)(-1, 0, 5), 0);
    strict_1.default.equal((0, utils_1.clamp)(3, 0, 5), 3);
});
