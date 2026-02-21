import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// 경량 작업: 키워드 추출, 분류 등
export const fastModel = openrouter("anthropic/claude-haiku-4.5");

// 일반 작업: 후속 채팅, 요약 등
export const defaultModel = openrouter("anthropic/claude-sonnet-4.6");

// 핵심 사고: 검증 리포트 생성, 구현 가능성 판정 등
export const thinkingModel = openrouter("anthropic/claude-opus-4.6");
