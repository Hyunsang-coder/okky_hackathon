import { anthropic } from "@ai-sdk/anthropic";

// 경량 작업: 키워드 추출, 분류 등
export const fastModel = anthropic("claude-haiku-4-5-20251001");

// 일반 작업: 후속 채팅, 요약 등
export const defaultModel = anthropic("claude-sonnet-4-5-20250929");

// 핵심 사고: 검증 리포트 생성, 구현 가능성 판정 등 (현재 미사용)
export const thinkingModel = anthropic("claude-opus-4-6");
