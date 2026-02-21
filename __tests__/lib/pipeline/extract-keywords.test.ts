import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KeywordExtraction } from "@/lib/pipeline/types";

// ai SDK mock
const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

// models mock (anthropic SDK 의존 제거)
vi.mock("@/lib/models", () => ({
  fastModel: "mock-haiku-model",
}));

const { extractKeywords } = await import(
  "@/lib/pipeline/extract-keywords"
);

beforeEach(() => {
  vi.clearAllMocks();
});

const SEARCHABLE_RESULT: KeywordExtraction = {
  classification: "SEARCHABLE",
  complexity: "LOW",
  reason: "API 조합으로 구현 가능",
  github_queries: [
    "image hashtag recommendation",
    "photo tag generator",
    "instagram hashtag tool",
  ],
  tavily_queries: {
    competitors: "instagram hashtag recommendation tool",
    trends: "AI image tagging trends 2025",
    technical: "image classification API comparison",
  },
  topics: ["hashtag-generator", "image-classification"],
};

const IMPOSSIBLE_RESULT: KeywordExtraction = {
  classification: "IMPOSSIBLE",
  reason: "뇌파 해독 기술이 소비자 수준에 도달하지 않음",
  alternative: "음성 명령으로 SNS에 포스팅하는 앱",
  github_queries: [],
  tavily_queries: {
    competitors: "",
    trends: "",
    technical: "",
  },
  topics: [],
};

const AMBIGUOUS_RESULT: KeywordExtraction = {
  classification: "AMBIGUOUS",
  complexity: "HIGH",
  data_dependencies: [
    {
      name: "실시간 교통 데이터",
      status: "AVAILABLE_PAID",
      detail: "Google Maps API 유료",
    },
  ],
  reason: "해석에 따라 범위가 달라짐",
  github_queries: ["traffic prediction", "route optimization"],
  tavily_queries: {
    competitors: "traffic prediction app",
    trends: "real-time traffic AI",
    technical: "traffic data API",
  },
  topics: ["traffic-prediction"],
};

describe("extractKeywords", () => {
  it("SEARCHABLE 분류 결과를 올바르게 반환한다", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: SEARCHABLE_RESULT });

    const result = await extractKeywords("인스타 사진 해시태그 추천 앱");

    expect(result.classification).toBe("SEARCHABLE");
    expect(result.complexity).toBe("LOW");
    expect(result.github_queries).toHaveLength(3);
    expect(result.topics).toHaveLength(2);
  });

  it("IMPOSSIBLE 분류 시 빈 쿼리와 대안을 반환한다", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: IMPOSSIBLE_RESULT });

    const result = await extractKeywords("뇌파로 SNS 포스팅하는 앱");

    expect(result.classification).toBe("IMPOSSIBLE");
    expect(result.github_queries).toHaveLength(0);
    expect(result.topics).toHaveLength(0);
    expect(result.alternative).toBeTruthy();
  });

  it("AMBIGUOUS 분류 시 data_dependencies를 포함한다", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: AMBIGUOUS_RESULT });

    const result = await extractKeywords("AI 교통 예측 내비게이션");

    expect(result.classification).toBe("AMBIGUOUS");
    expect(result.complexity).toBe("HIGH");
    expect(result.data_dependencies).toHaveLength(1);
    expect(result.data_dependencies![0].status).toBe("AVAILABLE_PAID");
  });

  it("generateObject에 올바른 파라미터를 전달한다", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: SEARCHABLE_RESULT });

    await extractKeywords("테스트 아이디어");

    expect(mockGenerateObject).toHaveBeenCalledOnce();
    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.model).toBe("mock-haiku-model");
    expect(callArgs.prompt).toContain("테스트 아이디어");
    expect(callArgs.system).toContain("사용자의 아이디어를 분석하라");
    expect(callArgs.schema).toBeDefined();
  });

  it("generateObject 에러 시 예외를 전파한다", async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error("API rate limit"));

    await expect(extractKeywords("아이디어")).rejects.toThrow("API rate limit");
  });

  it("아이디어 텍스트가 프롬프트에 포함된다", async () => {
    mockGenerateObject.mockResolvedValueOnce({ object: SEARCHABLE_RESULT });

    const idea = "반려동물 건강 관리 플랫폼";
    await extractKeywords(idea);

    const prompt = mockGenerateObject.mock.calls[0][0].prompt;
    expect(prompt).toBe(`사용자 아이디어: ${idea}`);
  });
});
