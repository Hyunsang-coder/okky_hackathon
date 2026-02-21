"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ExampleChips } from "@/components/ExampleChips";
import { HistoryList } from "@/components/HistoryList";

export default function Home() {
  const [idea, setIdea] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    router.push(`/check?idea=${encodeURIComponent(idea.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {/* Hero */}
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              만들고 싶은 게 있나요?
            </h1>
            <p className="text-lg text-foreground/50">
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
              className="w-full resize-none rounded-xl border border-foreground/10 bg-background p-4 text-base outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30"
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
              className="rounded-xl bg-foreground px-6 py-3 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-xl border border-foreground/5 p-4 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-medium text-foreground/60">
                  {step}
                </div>
                <h3 className="mb-1 text-sm font-medium">{title}</h3>
                <p className="text-xs text-foreground/40">{desc}</p>
              </div>
            ))}
          </div>

          {/* History */}
          <div className="mt-4 w-full">
            <HistoryList />
          </div>
        </div>
      </main>
    </div>
  );
}
