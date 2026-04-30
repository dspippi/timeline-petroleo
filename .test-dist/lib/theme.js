"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThemeConfig = getThemeConfig;
exports.saveThemeConfig = saveThemeConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CSS_FILE = path_1.default.join(process.cwd(), "app", "globals.css");
function getThemeConfig() {
    const content = fs_1.default.readFileSync(CSS_FILE, "utf-8");
    function parseBlock(blockStr) {
        const vars = {};
        const regex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
        let match;
        while ((match = regex.exec(blockStr)) !== null) {
            const key = match[1];
            if (key !== "scrollbar-track" && !key.startsWith("shadow-") && !key.startsWith("scrollbar-thumb")) {
                vars[key] = match[2].trim();
            }
        }
        return vars;
    }
    const rootMatch = content.match(/:root\s*{([^}]+)}/);
    const darkMatch = content.match(/\.dark\s*{([^}]+)}/);
    return {
        light: rootMatch ? parseBlock(rootMatch[1]) : {},
        dark: darkMatch ? parseBlock(darkMatch[1]) : {},
    };
}
function saveThemeConfig(config) {
    if (process.env.VERCEL === "1") {
        console.warn("Cannot save theme in Vercel environment");
        return;
    }
    let content = fs_1.default.readFileSync(CSS_FILE, "utf-8");
    function replaceInBlock(blockName, vars) {
        // Find the block first
        const blockRegex = new RegExp(`(${blockName}\\s*{)([^}]+)(})`);
        const blockMatch = content.match(blockRegex);
        if (!blockMatch)
            return;
        let blockContent = blockMatch[2];
        for (const [key, value] of Object.entries(vars)) {
            const varRegex = new RegExp(`(--${key}:\\s*)([^;]+)(;)`, "g");
            blockContent = blockContent.replace(varRegex, `$1${value}$3`);
        }
        content = content.replace(blockRegex, `$1${blockContent}$3`);
    }
    replaceInBlock(":root", config.light);
    replaceInBlock("\\.dark", config.dark);
    fs_1.default.writeFileSync(CSS_FILE, content, "utf-8");
}
