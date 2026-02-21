"use client";

import Link from "next/link";
import { ColorSchemeSelector } from "./ColorSchemeSelector";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          VibCheck
        </Link>
        <ColorSchemeSelector />
      </div>
    </header>
  );
}
