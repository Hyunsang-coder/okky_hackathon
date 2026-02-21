"use client";

import { VerdictBadge, getVerdictFromReport } from "./VerdictBadge";
import { MarkdownRenderer } from "./MarkdownRenderer";

function splitSections(markdown: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const lines = markdown.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = line;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading || currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}

export function ReportView({
  report,
  isStreaming,
}: {
  report: string;
  isStreaming: boolean;
}) {
  const verdict = getVerdictFromReport(report);
  const sections = splitSections(report);

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const isVerdictSection = section.heading.includes("판정:");
        const isLast = i === sections.length - 1;

        return (
          <div
            key={i}
            className={`rounded-xl border border-foreground/10 p-5 ${
              isVerdictSection
                ? "bg-foreground/[.03]"
                : "bg-background"
            }`}
          >
            {isVerdictSection && verdict && (
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
