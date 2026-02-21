"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense, useState } from "react";
import { Header } from "@/components/Header";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ReportView } from "@/components/ReportView";
import { ChatPanel } from "@/components/ChatPanel";
import { useAnalysis } from "@/hooks/useAnalysis";
import { addHistory, getHistoryEntry } from "@/lib/history";
import { parseReport, type ReportMeta } from "@/lib/report";

function CheckContent() {
  const searchParams = useSearchParams();
  const idea = searchParams.get("idea") ?? "";
  const historyId = searchParams.get("history") ?? "";
  const startedRef = useRef(false);
  const savedRef = useRef(false);

  const { state, steps, report, reportMeta, searchContext, error, startAnalysis } =
    useAnalysis();

  // Load from history
  const [historyReport, setHistoryReport] = useState("");
  const [historyMeta, setHistoryMeta] = useState<ReportMeta | null>(null);
  const [historyContext, setHistoryContext] = useState("");
  const [historyIdea, setHistoryIdea] = useState("");

  useEffect(() => {
    if (historyId) {
      const entry = getHistoryEntry(historyId);
      if (entry) {
        setHistoryReport(entry.report);
        setHistoryMeta(parseReport(entry.report));
        setHistoryContext(entry.searchContext || "");
        setHistoryIdea(entry.idea);
      }
    }
  }, [historyId]);

  // Start analysis on mount
  useEffect(() => {
    if (idea && !startedRef.current && !historyId) {
      startedRef.current = true;
      startAnalysis(idea);
    }
  }, [idea, historyId, startAnalysis]);

  // Save to history on complete
  useEffect(() => {
    if (state === "complete" && report && reportMeta && !savedRef.current) {
      savedRef.current = true;
      addHistory({
        idea,
        verdict: reportMeta.verdict ?? "분석 완료",
        report,
        searchContext,
      });
    }
  }, [state, report, reportMeta, idea, searchContext]);

  const displayIdea = historyId ? historyIdea : idea;
  const displayReport = historyId ? historyReport : report;
  const displayMeta = historyId ? historyMeta : reportMeta;
  const displayContext = historyId ? historyContext : searchContext;
  const isFromHistory = !!historyId;
  const isComplete = isFromHistory || state === "complete";
  const isStreaming = state === "generating";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {/* Idea card */}
        {displayIdea && (
          <div className="mb-6 rounded-xl border border-foreground/10 bg-foreground/[.02] p-4">
            <p className="text-xs font-medium text-foreground/40">
              입력한 아이디어
            </p>
            <p className="mt-1 text-foreground/80">{displayIdea}</p>
          </div>
        )}

        {/* Progress (only during analysis) */}
        {!isFromHistory && state !== "idle" && state !== "complete" && (
          <div className="mb-6 rounded-xl border border-foreground/10 p-5">
            <AnalysisProgress steps={steps} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Report */}
        {displayReport && (
          <ReportView report={displayReport} meta={displayMeta} isStreaming={isStreaming} />
        )}

        {/* Action buttons */}
        {isComplete && displayReport && (
          <div className="mt-4 flex gap-3">
            <a
              href="/"
              className="rounded-lg border border-foreground/10 px-4 py-2 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              새 아이디어 검증하기
            </a>
          </div>
        )}

        {/* Chat */}
        {isComplete && displayReport && (
          <ChatPanel
            report={displayReport}
            searchContext={displayContext}
          />
        )}
      </main>
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/60" />
        </div>
      }
    >
      <CheckContent />
    </Suspense>
  );
}
