"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type ColorScheme, DEFAULT_SCHEME, getSchemeById } from "@/lib/themes";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (id: string) => void;
}>({
  theme: "dark",
  toggle: () => {},
  colorScheme: DEFAULT_SCHEME,
  setColorScheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyColorScheme(scheme: ColorScheme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(scheme.colors)) {
    root.style.setProperty(`--${key}`, value);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(DEFAULT_SCHEME);

  useEffect(() => {
    const saved = localStorage.getItem("vibcheck-theme") as Theme | null;
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }

    const savedScheme = localStorage.getItem("vibcheck-color-scheme");
    if (savedScheme) {
      const scheme = getSchemeById(savedScheme);
      setColorSchemeState(scheme);
      applyColorScheme(scheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("vibcheck-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const setColorScheme = (id: string) => {
    const scheme = getSchemeById(id);
    setColorSchemeState(scheme);
    applyColorScheme(scheme);
    localStorage.setItem("vibcheck-color-scheme", id);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
