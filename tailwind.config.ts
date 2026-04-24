import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          hover: "var(--bg-surface-hover)",
          alt: "var(--bg-surface-alt)"
        },
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)"
        },
        line: {
          subtle: "var(--border-subtle)",
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)"
        },
        brand: {
          DEFAULT: "var(--accent-main)",
          hover: "var(--accent-hover)",
          bg: "var(--accent-bg)"
        },
        "event-war": "#ef4444",
        "event-discovery": "#22c55e",
        "event-policy": "#3b82f6",
        "event-company": "#f59e0b",
        "event-crisis": "#a855f7",
        "brasil-accent": "#f59e0b",
      },
      boxShadow: {
        "text-glow": "var(--shadow-text-glow)",
        "brand-glow": "var(--shadow-brand-glow)",
        "panel": "var(--shadow-panel)",
      },
      dropShadow: {
        "text-glow": "var(--shadow-text-glow)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
