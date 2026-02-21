"use client";

import { useState, useCallback } from "react";
import type { ProgressStep } from "@/components/AnalysisProgress";
import type { ReportMeta } from "@/lib/report";
import { parseSSELine } from "@/lib/sse";

export type AnalysisState =
  | "idle"
  | "extracting"
  | "searching"
  | "generating"
  | "complete"
  | "error";

interface UseAnalysisReturn {
  state: AnalysisState;
  steps: ProgressStep[];
  report: string;
  reportMeta: ReportMeta | null;
  searchContext: string;
  error: string | null;
  startAnalysis: (idea: string) => void;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "keywords", label: "아이디어 분석 중...", status: "pending" },
  {
    id: "github",
    label: "GitHub에서 유사 프로젝트 찾는 중...",
    status: "pending",
  },
  { id: "tavily", label: "웹에서 시장 정보 수집 중...", status: "pending" },
  { id: "ranking", label: "검색 결과 정리 중...", status: "pending" },
  { id: "report", label: "AI 리포트 생성 중...", status: "pending" },
];

function updateStep(
  steps: ProgressStep[],
  id: string,
  update: Partial<ProgressStep>
): ProgressStep[] {
  return steps.map((s) => (s.id === id ? { ...s, ...update } : s));
}

export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<AnalysisState>("idle");
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [report, setReport] = useState("");
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [searchContext, setSearchContext] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async (idea: string) => {
    setState("extracting");
    setSteps(
      INITIAL_STEPS.map((s, i) =>
        i === 0 ? { ...s, status: "active" as const } : s
      )
    );
    setReport("");
    setReportMeta(null);
    setSearchContext("");
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const message = parseSSELine(line);
          if (!message) continue;

          if (message.type === "done") {
            setState("complete");
            continue;
          }

          if (message.type === "progress") {
            const { step, status, detail } = message.data;

            if (status === "started") {
              setSteps((prev) =>
                updateStep(prev, step, { status: "active", detail })
              );

              if (step === "github" || step === "tavily") {
                setState("searching");
              } else if (step === "report") {
                setState("generating");
              }
            } else if (status === "completed") {
              setSteps((prev) =>
                updateStep(prev, step, { status: "completed", detail })
              );
            } else if (status === "error") {
              setSteps((prev) =>
                updateStep(prev, step, { status: "error", detail })
              );
            }
          } else if (message.type === "text") {
            setReport((prev) => prev + message.data);
          } else if (message.type === "report-meta") {
            setReportMeta(message.data);
          } else if (message.type === "context") {
            setSearchContext(message.data);
          } else if (message.type === "error") {
            setError(message.data);
            setState("error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }, []);

  return { state, steps, report, reportMeta, searchContext, error, startAnalysis };
}
