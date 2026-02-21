"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ExampleChips } from "@/components/ExampleChips";
import { HistoryList } from "@/components/HistoryList";
import { findMatchingHistory, type HistoryEntry } from "@/lib/history";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [duplicateEntry, setDuplicateEntry] = useState<HistoryEntry | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;

    const match = findMatchingHistory(idea);
    if (match) {
      setDuplicateEntry(match);
      return;
    }
    router.push(`/check?idea=${encodeURIComponent(idea.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-12 pb-20">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {/* Hero */}
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              만들고 싶은 게 있나요?
            </h1>
            <p className="text-lg text-muted">
              아이디어를 입력하면 AI가 구현 가능성을 검증해드려요
            </p>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-4"
          >
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="만들고 싶은 아이디어를 자유롭게 설명해주세요"
              rows={4}
              className="w-full resize-none rounded-xl border border-outline/60 bg-surface p-4 text-base outline-none transition-colors placeholder:text-muted focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!idea.trim()}
              className="rounded-xl bg-primary px-6 py-3 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              검증해보기
            </button>
          </form>

          {/* Example chips */}
          <ExampleChips onSelect={setIdea} />

          {/* How it works */}
          <div className="mt-8 grid w-full gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "아이디어를 알려주세요",
                desc: "만들고 싶은 것을 자유롭게 설명하세요",
              },
              {
                step: "2",
                title: "GitHub, 웹, AI가 분석합니다",
                desc: "유사 프로젝트와 시장 트렌드를 검색해요",
              },
              {
                step: "3",
                title: '"만들 수 있어?"에 답합니다',
                desc: "구현 가능성과 구체적 로드맵을 제시해요",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="rounded-xl border border-outline/50 bg-surface/70 p-4 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-medium text-foreground">
                  {step}
                </div>
                <h3 className="mb-1 text-sm font-medium text-foreground">{title}</h3>
                <p className="text-xs text-muted">{desc}</p>
              </div>
            ))}
          </div>

          {/* History */}
          <div className="mt-4 w-full">
            <HistoryList />
          </div>
        </div>
      </main>

      {/* Duplicate detection dialog */}
      {duplicateEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-outline/60 bg-surface p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              이전에 검증한 아이디어예요
            </h2>
            <p className="mb-6 text-sm text-muted">
              동일한 아이디어로 이미 분석한 결과가 있습니다. 이전 결과를 확인하거나 새로 분석할 수 있어요.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setDuplicateEntry(null);
                  router.push(`/check?history=${duplicateEntry.id}`);
                }}
                className="w-full rounded-xl border border-outline/60 bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary-soft"
              >
                이전 결과 보기
              </button>
              <button
                onClick={() => {
                  setDuplicateEntry(null);
                  router.push(`/check?idea=${encodeURIComponent(idea.trim())}`);
                }}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                새로 분석하기
              </button>
              <button
                onClick={() => setDuplicateEntry(null)}
                className="w-full rounded-xl px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
