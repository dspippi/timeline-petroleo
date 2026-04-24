import fs from "fs";
import path from "path";

const CSS_FILE = path.join(process.cwd(), "app", "globals.css");

export type ThemeVariables = {
  "bg-app": string;
  "bg-surface": string;
  "bg-surface-alt": string;
  "text-primary": string;
  "text-secondary": string;
  "text-tertiary": string;
  "text-muted": string;
  "border-subtle": string;
  "border-default": string;
  "border-strong": string;
  "accent-main": string;
  "accent-hover": string;
  "accent-bg": string;
};

export type ThemeConfig = {
  light: ThemeVariables;
  dark: ThemeVariables;
};

export function getThemeConfig(): ThemeConfig {
  const content = fs.readFileSync(CSS_FILE, "utf-8");

  function parseBlock(blockStr: string): ThemeVariables {
    const vars: any = {};
    const regex = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
    let match;
    while ((match = regex.exec(blockStr)) !== null) {
      const key = match[1];
      if (key !== "scrollbar-track" && !key.startsWith("shadow-") && !key.startsWith("scrollbar-thumb")) {
        vars[key] = match[2].trim();
      }
    }
    return vars as ThemeVariables;
  }

  const rootMatch = content.match(/:root\s*{([^}]+)}/);
  const darkMatch = content.match(/\.dark\s*{([^}]+)}/);

  return {
    light: rootMatch ? parseBlock(rootMatch[1]) : ({} as any),
    dark: darkMatch ? parseBlock(darkMatch[1]) : ({} as any),
  };
}

export function saveThemeConfig(config: ThemeConfig) {
  if (process.env.VERCEL === "1") {
    console.warn("Cannot save theme in Vercel environment");
    return;
  }

  let content = fs.readFileSync(CSS_FILE, "utf-8");

  function replaceInBlock(blockName: string, vars: Record<string, string>) {
    // Find the block first
    const blockRegex = new RegExp(`(${blockName}\\s*{)([^}]+)(})`);
    const blockMatch = content.match(blockRegex);
    if (!blockMatch) return;

    let blockContent = blockMatch[2];
    for (const [key, value] of Object.entries(vars)) {
      const varRegex = new RegExp(`(--${key}:\\s*)([^;]+)(;)`, "g");
      blockContent = blockContent.replace(varRegex, `$1${value}$3`);
    }

    content = content.replace(blockRegex, `$1${blockContent}$3`);
  }

  replaceInBlock(":root", config.light);
  replaceInBlock("\\.dark", config.dark);

  fs.writeFileSync(CSS_FILE, content, "utf-8");
}
