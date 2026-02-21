import { describe, it, expect } from "vitest";
import {
  encodeSSE,
  parseSSELine,
  encodeProgress,
  encodeDone,
  type SSEEvent,
} from "@/lib/sse";

describe("encodeSSE / parseSSELine 라운드트립", () => {
  it("progress 이벤트를 인코딩/디코딩한다", () => {
    const event: SSEEvent = {
      type: "progress",
      data: { step: "keywords", status: "started" },
    };
    const encoded = encodeSSE(event);
    expect(encoded).toMatch(/^data: .+\n\n$/);

    const line = encoded.split("\n")[0]; // "data: ..."
    const parsed = parseSSELine(line);
    expect(parsed).toEqual(event);
  });

  it("text 이벤트 라운드트립", () => {
    const event: SSEEvent = { type: "text", data: "안녕하세요" };
    const line = encodeSSE(event).split("\n")[0];
    expect(parseSSELine(line)).toEqual(event);
  });

  it("error 이벤트 라운드트립", () => {
    const event: SSEEvent = { type: "error", data: "서버 에러" };
    const line = encodeSSE(event).split("\n")[0];
    expect(parseSSELine(line)).toEqual(event);
  });

  it("context 이벤트 라운드트립", () => {
    const event: SSEEvent = { type: "context", data: "<xml>context</xml>" };
    const line = encodeSSE(event).split("\n")[0];
    expect(parseSSELine(line)).toEqual(event);
  });

  it("detail이 포함된 progress 이벤트", () => {
    const event: SSEEvent = {
      type: "progress",
      data: { step: "github", status: "completed", detail: "12개 발견" },
    };
    const line = encodeSSE(event).split("\n")[0];
    expect(parseSSELine(line)).toEqual(event);
  });
});

describe("encodeProgress", () => {
  it("올바른 SSE 형식을 생성한다", () => {
    const result = encodeProgress("keywords", "started");
    expect(result).toBe(
      `data: ${JSON.stringify({
        type: "progress",
        data: { step: "keywords", status: "started" },
      })}\n\n`
    );
  });

  it("detail 파라미터를 포함한다", () => {
    const result = encodeProgress("github", "completed", "5개 발견");
    const line = result.split("\n")[0];
    const parsed = parseSSELine(line);
    expect(parsed).toEqual({
      type: "progress",
      data: { step: "github", status: "completed", detail: "5개 발견" },
    });
  });
});

describe("encodeDone", () => {
  it("[DONE] 시그널을 인코딩한다", () => {
    expect(encodeDone()).toBe("data: [DONE]\n\n");
  });

  it("[DONE] 시그널을 파싱한다", () => {
    const parsed = parseSSELine("data: [DONE]");
    expect(parsed).toEqual({ type: "done" });
  });
});

describe("parseSSELine 엣지 케이스", () => {
  it("data: 접두사가 없으면 null 반환", () => {
    expect(parseSSELine("event: message")).toBeNull();
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine("random text")).toBeNull();
  });

  it("잘못된 JSON이면 null 반환", () => {
    expect(parseSSELine("data: {invalid json")).toBeNull();
  });

  it("빈 data 필드는 null 반환", () => {
    expect(parseSSELine("data: ")).toBeNull();
  });
});
