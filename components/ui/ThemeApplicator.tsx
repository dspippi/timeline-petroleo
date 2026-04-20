"use client";

import { useEffect } from "react";
import { useDarkMode } from "@/context/SettingsContext";

export function ThemeApplicator() {
  const darkMode = useDarkMode();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  return null;
}
