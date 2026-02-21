"use client";

import { useChat } from "@ai-sdk/react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";

function CheckContent() {
  const searchParams = useSearchParams();
  const idea = searchParams.get("idea") ?? "";
  const sentRef = useRef(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat();

  useEffect(() => {
    if (idea && !sentRef.current) {
      sentRef.current = true;
      sendMessage({ text: idea });
    }
  }, [idea, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
      <header className="mb-6">
        <a
          href="/"
          className="text-sm text-foreground/50 hover:text-foreground/80"
        >
          &larr; 새 아이디어 검증
        </a>
        <h1 className="mt-2 text-2xl font-bold">검증 리포트</h1>
      </header>

      {idea && (
        <div className="mb-6 rounded-xl border border-foreground/10 bg-foreground/[.03] p-4">
          <p className="text-sm font-medium text-foreground/50">
            입력한 아이디어
          </p>
          <p className="mt-1">{idea}</p>
        </div>
      )}

      <div className="flex-1 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-xl p-4 ${
              message.role === "user"
                ? "ml-auto max-w-[80%] bg-foreground text-background"
                : "bg-foreground/[.05]"
            }`}
          >
            <div className="whitespace-pre-wrap">
              {message.parts
                .filter((part) => part.type === "text")
                .map((part, i) => (
                  <span key={i}>{part.text}</span>
                ))}
            </div>
          </div>
        ))}

        {status === "streaming" &&
          messages.length > 0 &&
          messages[messages.length - 1].role !== "assistant" && (
            <div className="rounded-xl bg-foreground/[.05] p-4">
              <div className="animate-pulse text-foreground/50">분석 중...</div>
            </div>
          )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 mt-6 flex gap-2 bg-background pb-4 pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="추가 질문을 입력하세요..."
          className="flex-1 rounded-xl border border-foreground/10 bg-background px-4 py-3 text-base outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "streaming"}
          className="rounded-xl bg-foreground px-5 py-3 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          로딩 중...
        </div>
      }
    >
      <CheckContent />
    </Suspense>
  );
}
