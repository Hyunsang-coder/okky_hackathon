"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type ColorScheme, DEFAULT_SCHEME, getSchemeById } from "@/lib/themes";

const ThemeContext = createContext<{
  colorScheme: ColorScheme;
  setColorScheme: (id: string) => void;
}>({
  colorScheme: DEFAULT_SCHEME,
  setColorScheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyColorScheme(scheme: ColorScheme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(scheme.colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(DEFAULT_SCHEME);

  useEffect(() => {
    const savedScheme = localStorage.getItem("vibcheck-color-scheme");
    const scheme = savedScheme ? getSchemeById(savedScheme) : DEFAULT_SCHEME;
    setColorSchemeState(scheme);
    applyColorScheme(scheme);
  }, []);

  const setColorScheme = (id: string) => {
    const scheme = getSchemeById(id);
    setColorSchemeState(scheme);
    applyColorScheme(scheme);
    localStorage.setItem("vibcheck-color-scheme", id);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
