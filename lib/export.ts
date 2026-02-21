import type { ReportMeta } from "./report";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateSuffix(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export function downloadJSON(
  idea: string,
  report: string,
  meta: ReportMeta | null,
  searchContext: string,
) {
  const payload = {
    idea,
    verdict: meta?.verdict ?? null,
    confidence: meta?.confidence ?? null,
    sections: (meta?.sections ?? []).map((s) => ({
      heading: s.heading,
      content: s.content,
    })),
    searchContext: searchContext || undefined,
    analyzedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, `vibcheck-결과-${dateSuffix()}.json`);
}

export function downloadMarkdown(idea: string, report: string) {
  const date = new Date().toISOString().split("T")[0];
  const md = `# VibCheck 분석 결과

> **아이디어:** ${idea}
> **분석 일시:** ${date}

---

${report}
`;

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, `vibcheck-결과-${dateSuffix()}.md`);
}
