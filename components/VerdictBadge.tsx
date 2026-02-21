"use client";

import type { Verdict } from "@/lib/report";

const VERDICT_COLORS: Record<Verdict, { bg: string; text: string; border: string }> = {
  "바이브코딩으로 가능": {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/30",
  },
  "조건부 가능": {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
  },
  "개발자 도움 필요": {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/30",
  },
  "현재 기술로 어려움": {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
  },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const colors = VERDICT_COLORS[verdict];

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {verdict}
    </span>
  );
}
