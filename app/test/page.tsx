"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ExampleChips } from "@/components/ExampleChips";

export default function TestPage() {
  const [idea, setIdea] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    router.push(`/check?idea=${encodeURIComponent(idea.trim())}&test=1`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-12 pb-20">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          {/* Hero */}
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="rounded-full border border-outline/60 px-3 py-1 text-xs text-muted">
              UI 테스트 모드 — API 호출 없이 mock 데이터로 동작합니다
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              만들고 싶은 게 있나요?
            </h1>
            <p className="text-lg text-muted">
              아이디어를 입력하면 AI가 구현 가능성을 검증해드려요
            </p>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
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
        </div>
      </main>
    </div>
  );
}
