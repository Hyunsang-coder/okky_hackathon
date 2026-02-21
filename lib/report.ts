// ─── 리포트 공유 스키마 ───
// 서버와 클라이언트가 동일한 리포트 구조를 참조합니다.
// 파싱 로직의 단일 소스로, 컴포넌트에서 regex 파싱을 제거합니다.

export type Verdict =
  | "바이브코딩으로 가능"
  | "조건부 가능"
  | "개발자 도움 필요"
  | "현재 기술로 어려움";

export const VERDICTS: readonly Verdict[] = [
  "바이브코딩으로 가능",
  "조건부 가능",
  "개발자 도움 필요",
  "현재 기술로 어려움",
] as const;

export interface ReportSection {
  heading: string;
  content: string;
  isVerdict: boolean;
}

export interface ReportMeta {
  verdict: Verdict | null;
  confidence: number | null;
  sections: ReportSection[];
}

export function isVerdict(value: string): value is Verdict {
  return (VERDICTS as readonly string[]).includes(value);
}

const VERDICT_PREFIX = "## 판정:";
const CONFIDENCE_KEY = "확신도:";

/**
 * 마크다운 리포트를 구조화된 데이터로 변환합니다.
 * 서버(route)와 클라이언트(hooks, history) 양쪽에서 사용 가능한 단일 파서입니다.
 */
export function parseReport(markdown: string): ReportMeta {
  const sections: ReportSection[] = [];
  const lines = markdown.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
          isVerdict: currentHeading.startsWith(VERDICT_PREFIX),
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
      isVerdict: currentHeading.startsWith(VERDICT_PREFIX),
    });
  }

  let verdict: Verdict | null = null;
  let confidence: number | null = null;

  const verdictSection = sections.find((s) => s.isVerdict);
  if (verdictSection) {
    // "## 판정: 바이브코딩으로 가능" → "바이브코딩으로 가능"
    const verdictText = verdictSection.heading
      .slice(VERDICT_PREFIX.length)
      .trim();
    if (isVerdict(verdictText)) {
      verdict = verdictText;
    }

    // "**확신도:** 0.85" → 0.85
    const confLine = verdictSection.content
      .split("\n")
      .find((l) => l.includes(CONFIDENCE_KEY));
    if (confLine) {
      const afterKey = confLine.slice(
        confLine.indexOf(CONFIDENCE_KEY) + CONFIDENCE_KEY.length,
      );
      const num = parseFloat(afterKey.replaceAll("*", "").trim());
      if (!isNaN(num) && num >= 0 && num <= 1) {
        confidence = num;
      }
    }
  }

  return { verdict, confidence, sections };
}
