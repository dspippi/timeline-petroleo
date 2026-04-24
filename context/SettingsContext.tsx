"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Settings {
  rowHeight: number;
  markerSize: number;
  showEventLabels: boolean;
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  rowHeight: 48,
  markerSize: 11,
  showEventLabels: true,
  darkMode: false,
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function useDarkMode() {
  const { settings } = useSettings();
  return settings.darkMode;
}
