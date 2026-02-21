"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect, useMemo } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { DefaultChatTransport } from "ai";

const SUGGESTED_QUESTIONS = [
  "로드맵을 더 자세히 알려주세요",
  "더 쉬운 방법은 없나요?",
  "범위를 줄이면 어떻게 될까요?",
  "비용은 얼마나 들까요?",
];

export function ChatPanel({
  report,
  searchContext,
}: {
  report: string;
  searchContext: string;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { report, searchContext },
      }),
    [report, searchContext]
  );

  const { messages, sendMessage, status } = useChat({ transport });

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleSuggestion = (q: string) => {
    if (status === "streaming") return;
    sendMessage({ text: q });
  };

  return (
    <div className="mt-6 rounded-xl border border-outline/55 bg-surface/55 p-5">
      <h3 className="mb-4 text-lg font-semibold">궁금한 점을 물어보세요</h3>

      {messages.length === 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSuggestion(q)}
              className="rounded-full border border-outline/60 bg-surface/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg p-3 ${
                message.role === "user"
                  ? "ml-auto max-w-[80%] bg-primary text-white"
                  : "bg-surface-strong/70"
              }`}
            >
              {message.role === "user" ? (
                <p className="text-sm">
                  {message.parts
                    .filter((p) => p.type === "text")
                    .map((p) => ("text" in p ? p.text : ""))
                    .join("")}
                </p>
              ) : (
                <MarkdownRenderer
                  content={message.parts
                    .filter((p) => p.type === "text")
                    .map((p) => ("text" in p ? p.text : ""))
                    .join("")}
                />
              )}
            </div>
          ))}
          {status === "streaming" &&
            messages.length > 0 &&
            messages[messages.length - 1].role !== "assistant" && (
              <div className="rounded-lg bg-surface-strong/70 p-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-outline/50 border-t-primary" />
              </div>
            )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="추가 질문을 입력하세요..."
          className="flex-1 rounded-lg border border-outline/60 bg-surface px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary"
        />
        <button
          type="submit"
          disabled={!input.trim() || status === "streaming"}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}
