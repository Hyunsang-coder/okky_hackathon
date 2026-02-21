"use client";

import type { Verdict } from "@/lib/report";

const VERDICT_COLORS: Record<Verdict, { bg: string; text: string; border: string }> = {
  "바이브코딩으로 가능": {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
  },
  "조건부 가능": {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
  },
  "개발자 도움 필요": {
    bg: "bg-caution/10",
    text: "text-caution",
    border: "border-caution/30",
  },
  "현재 기술로 어려움": {
    bg: "bg-danger/10",
    text: "text-danger",
    border: "border-danger/30",
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
