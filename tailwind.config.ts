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
        "event-war": "#ef4444",
        "event-discovery": "#22c55e",
        "event-policy": "#3b82f6",
        "event-company": "#f59e0b",
        "event-crisis": "#a855f7",
        "brasil-accent": "#f59e0b",
        "surface-1": "#0a0a0f",
        "surface-2": "#111118",
        "surface-3": "#1a1a24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
