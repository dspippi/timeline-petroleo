"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_PATH = void 0;
exports.withBasePath = withBasePath;
function normalizeBasePath(value) {
    if (!value)
        return "";
    let v = value.trim();
    if (!v)
        return "";
    if (!v.startsWith("/"))
        v = `/${v}`;
    if (v.length > 1 && v.endsWith("/"))
        v = v.slice(0, -1);
    return v;
}
exports.BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
function withBasePath(path) {
    if (!path.startsWith("/")) {
        throw new Error(`withBasePath: path must start with "/" (got "${path}")`);
    }
    return `${exports.BASE_PATH}${path}`;
}
