"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, type HistoryEntry } from "@/lib/history";
import { isVerdict } from "@/lib/report";
import { VerdictBadge } from "./VerdictBadge";

export function HistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="mb-3 text-sm font-medium text-foreground/40">
        이전 검증 기록
      </h2>
      <div className="space-y-2">
        {history.slice(0, 5).map((entry) => (
          <Link
            key={entry.id}
            href={`/check?history=${entry.id}`}
            className="flex items-center justify-between rounded-lg border border-foreground/5 p-3 transition-colors hover:bg-foreground/[.03]"
          >
            <span className="mr-3 flex-1 truncate text-sm text-foreground/70">
              {entry.idea}
            </span>
            {isVerdict(entry.verdict) && (
              <VerdictBadge verdict={entry.verdict} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
