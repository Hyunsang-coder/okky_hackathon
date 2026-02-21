"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { COLOR_SCHEMES } from "@/lib/themes";

export function ColorSchemeSelector() {
  const { colorScheme, setColorScheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg p-2 text-muted transition-colors hover:bg-primary-soft hover:text-foreground"
        aria-label="컬러 스킴 선택"
      >
        <div
          className="h-4 w-4 rounded-full border border-outline/60"
          style={{ background: colorScheme.colors.accent }}
        />
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-outline/60 bg-surface p-2 shadow-lg">
          <p className="mb-2 px-2 text-xs font-medium text-muted">컬러 스킴</p>
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => {
                setColorScheme(scheme.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-primary-soft ${
                colorScheme.id === scheme.id
                  ? "text-foreground"
                  : "text-muted"
              }`}
            >
              <div className="flex -space-x-1">
                {[scheme.colors.accent, scheme.colors.success, scheme.colors.danger].map(
                  (color, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border border-surface"
                      style={{ background: color }}
                    />
                  ),
                )}
              </div>
              <span className="flex-1 text-left">{scheme.name}</span>
              {colorScheme.id === scheme.id && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
