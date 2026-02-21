"use client";

import { parseReport, type ReportMeta } from "@/lib/report";
import { VerdictBadge } from "./VerdictBadge";
import { MarkdownRenderer } from "./MarkdownRenderer";

export function ReportView({
  report,
  meta,
  isStreaming,
}: {
  report: string;
  meta: ReportMeta | null;
  isStreaming: boolean;
}) {
  // 스트리밍 중: 누적된 텍스트에서 파싱 / 완료 후: 서버 제공 구조화 데이터 사용
  const { verdict, sections } = meta ?? parseReport(report);

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const isLast = i === sections.length - 1;

        return (
          <div
            key={i}
            className={`rounded-xl border border-foreground/10 p-5 ${
              section.isVerdict
                ? "bg-foreground/[.03]"
                : "bg-background"
            }`}
          >
            {section.isVerdict && verdict && (
              <div className="mb-3">
                <VerdictBadge verdict={verdict} />
              </div>
            )}
            <MarkdownRenderer
              content={
                section.heading
                  ? `${section.heading}\n${section.content}`
                  : section.content
              }
            />
            {isStreaming && isLast && (
              <span className="inline-block h-4 w-1 animate-pulse bg-foreground/60" />
            )}
          </div>
        );
      })}
    </div>
  );
}
