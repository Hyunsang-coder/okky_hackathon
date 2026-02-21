"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [idea, setIdea] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    router.push(`/check?idea=${encodeURIComponent(idea.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">VibCheck</h1>
          <p className="text-lg text-foreground/60">
            내 아이디어, 직접 만들 수 있을까?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="만들고 싶은 아이디어를 자유롭게 설명해주세요. 예: 인스타그램 사진을 자동으로 분석해서 해시태그 추천해주는 앱"
            rows={5}
            className="w-full resize-none rounded-xl border border-foreground/10 bg-background p-4 text-base outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30"
          />
          <button
            type="submit"
            disabled={!idea.trim()}
            className="rounded-xl bg-foreground px-6 py-3 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            검증하기
          </button>
        </form>
      </main>
    </div>
  );
}
