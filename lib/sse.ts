// ─── SSE 공유 스키마 ───
// 서버(API route)와 클라이언트(hooks)가 동일한 타입을 참조합니다.

// Progress 이벤트의 step ID
export type ProgressStepId =
  | "keywords"
  | "github"
  | "tavily"
  | "ranking"
  | "report";

// Progress 이벤트의 상태
export type ProgressStatus = "started" | "completed" | "error";

export interface SSEProgressData {
  step: ProgressStepId;
  status: ProgressStatus;
  detail?: string;
}

// 모든 SSE 이벤트의 discriminated union
export type SSEEvent =
  | { type: "progress"; data: SSEProgressData }
  | { type: "text"; data: string }
  | { type: "context"; data: string }
  | { type: "error"; data: string };

// 파싱 결과 (done 시그널 포함)
export type SSEMessage = SSEEvent | { type: "done" };

// ─── 서버용: 인코딩 헬퍼 ───

export function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function encodeProgress(
  step: ProgressStepId,
  status: ProgressStatus,
  detail?: string,
): string {
  return encodeSSE({ type: "progress", data: { step, status, detail } });
}

export function encodeDone(): string {
  return `data: [DONE]\n\n`;
}

// ─── 클라이언트용: 파싱 헬퍼 ───

export function parseSSELine(line: string): SSEMessage | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6);
  if (payload === "[DONE]") return { type: "done" };
  try {
    return JSON.parse(payload) as SSEEvent;
  } catch {
    return null;
  }
}
