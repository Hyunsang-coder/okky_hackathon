import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// TAVILY_API_KEY는 모듈 로드 시점에 읽으므로 env 설정 후 import
vi.stubEnv("TAVILY_API_KEY", "test-tavily-key");

const { searchTavily } = await import("@/lib/pipeline/search-tavily");

const DEFAULT_QUERIES = {
  competitors: "instagram hashtag tool alternatives",
  trends: "AI image tagging trends 2025",
  technical: "image classification API comparison",
};

function makeTavilyResponse(
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>
) {
  return {
    ok: true,
    json: () => Promise.resolve({ results }),
  };
}

function mockFailedResponse() {
  return { ok: false, json: () => Promise.resolve({}) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchTavily", () => {
  it("3개 카테고리를 병렬로 검색한다", async () => {
    mockFetch.mockResolvedValue(
      makeTavilyResponse([
        { title: "Result", url: "https://example.com", content: "content", score: 0.8 },
      ])
    );

    await searchTavily(DEFAULT_QUERIES);

    expect(mockFetch).toHaveBeenCalledTimes(3);

    // 모든 호출이 Tavily API endpoint를 향하는지 확인
    for (const call of mockFetch.mock.calls) {
      expect(call[0]).toBe("https://api.tavily.com/search");
      expect(call[1].method).toBe("POST");
    }
  });

  it("각 카테고리별 올바른 파라미터를 전달한다", async () => {
    mockFetch.mockResolvedValue(makeTavilyResponse([]));

    await searchTavily(DEFAULT_QUERIES);

    const bodies = mockFetch.mock.calls.map(
      (c) => JSON.parse(c[1].body as string)
    );

    // competitors: advanced, include_domains
    const competitors = bodies.find(
      (b) => b.query === DEFAULT_QUERIES.competitors
    );
    expect(competitors.search_depth).toBe("advanced");
    expect(competitors.include_domains).toContain("producthunt.com");
    expect(competitors.max_results).toBe(8);

    // trends: news topic, time_range
    const trends = bodies.find((b) => b.query === DEFAULT_QUERIES.trends);
    expect(trends.topic).toBe("news");
    expect(trends.time_range).toBe("month");

    // technical: include_answer
    const technical = bodies.find(
      (b) => b.query === DEFAULT_QUERIES.technical
    );
    expect(technical.include_answer).toBe("basic");
    expect(technical.max_results).toBe(5);
  });

  it("API 키를 body에 포함한다", async () => {
    mockFetch.mockResolvedValue(makeTavilyResponse([]));

    await searchTavily(DEFAULT_QUERIES);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.api_key).toBe("test-tavily-key");
  });

  it("score > 0.5인 결과만 포함한다", async () => {
    mockFetch.mockResolvedValue(
      makeTavilyResponse([
        { title: "High", url: "https://high.com", content: "good", score: 0.9 },
        { title: "Low", url: "https://low.com", content: "bad", score: 0.3 },
        { title: "Edge", url: "https://edge.com", content: "edge", score: 0.5 },
      ])
    );

    const result = await searchTavily(DEFAULT_QUERIES);

    const urls = result.map((r) => r.url);
    expect(urls).toContain("https://high.com");
    expect(urls).not.toContain("https://low.com");
    expect(urls).not.toContain("https://edge.com"); // 0.5는 > 0.5 아님
  });

  it("content를 500자로 자른다", async () => {
    const longContent = "A".repeat(1000);
    mockFetch.mockResolvedValue(
      makeTavilyResponse([
        { title: "Long", url: "https://long.com", content: longContent, score: 0.8 },
      ])
    );

    const result = await searchTavily(DEFAULT_QUERIES);

    const item = result.find((r) => r.url === "https://long.com");
    expect(item!.content).toHaveLength(500);
  });

  it("URL이 중복되면 첫 번째만 유지한다", async () => {
    // 3개 카테고리 모두 같은 URL 반환
    mockFetch.mockResolvedValue(
      makeTavilyResponse([
        { title: "Same", url: "https://same.com", content: "dup", score: 0.8 },
      ])
    );

    const result = await searchTavily(DEFAULT_QUERIES);

    const sameUrls = result.filter((r) => r.url === "https://same.com");
    expect(sameUrls).toHaveLength(1);
  });

  it("결과를 score 내림차순으로 정렬한다", async () => {
    let callIdx = 0;
    mockFetch.mockImplementation(() => {
      const scores = [0.6, 0.95, 0.75];
      const s = scores[callIdx++] || 0.7;
      return Promise.resolve(
        makeTavilyResponse([
          { title: `S${s}`, url: `https://${s}.com`, content: "c", score: s },
        ])
      );
    });

    const result = await searchTavily(DEFAULT_QUERIES);

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("category 라벨을 올바르게 매핑한다", async () => {
    let callIdx = 0;
    const categories = ["competitors", "trends", "technical"];

    mockFetch.mockImplementation(() => {
      const cat = categories[callIdx++];
      return Promise.resolve(
        makeTavilyResponse([
          { title: cat!, url: `https://${cat}.com`, content: "c", score: 0.8 },
        ])
      );
    });

    const result = await searchTavily(DEFAULT_QUERIES);

    expect(result.find((r) => r.url === "https://competitors.com")?.category).toBe("competitors");
    expect(result.find((r) => r.url === "https://trends.com")?.category).toBe("trends");
    expect(result.find((r) => r.url === "https://technical.com")?.category).toBe("technical");
  });

  it("fetch 실패 시 해당 카테고리를 건너뛴다", async () => {
    let callIdx = 0;
    mockFetch.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return Promise.resolve(mockFailedResponse());
      return Promise.resolve(
        makeTavilyResponse([
          { title: "OK", url: `https://ok-${callIdx}.com`, content: "c", score: 0.8 },
        ])
      );
    });

    const result = await searchTavily(DEFAULT_QUERIES);

    // 실패한 1개 제외, 나머지 2개 카테고리 결과만 존재
    expect(result.length).toBe(2);
  });

  it("fetch가 예외를 던져도 빈 배열로 처리한다", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await searchTavily(DEFAULT_QUERIES);

    expect(result).toEqual([]);
  });

  it("빈 results 응답을 처리한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });

    const result = await searchTavily(DEFAULT_QUERIES);

    expect(result).toEqual([]);
  });
});

describe("searchTavily - 한국어 검색", () => {
  it("korean 쿼리가 있으면 4개 카테고리를 병렬로 검색한다", async () => {
    mockFetch.mockResolvedValue(
      makeTavilyResponse([
        { title: "Result", url: "https://example.com", content: "content", score: 0.8 },
      ])
    );

    await searchTavily({ ...DEFAULT_QUERIES, korean: "반려동물 건강 관리 앱" });

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("korean 카테고리에 한국 도메인이 포함된다", async () => {
    mockFetch.mockResolvedValue(makeTavilyResponse([]));

    await searchTavily({ ...DEFAULT_QUERIES, korean: "네이버 카페 크롤링" });

    const bodies = mockFetch.mock.calls.map(
      (c) => JSON.parse(c[1].body as string)
    );

    const koreanSearch = bodies.find((b) => b.query === "네이버 카페 크롤링");
    expect(koreanSearch).toBeDefined();
    expect(koreanSearch.include_domains).toContain("tistory.com");
    expect(koreanSearch.include_domains).toContain("velog.io");
    expect(koreanSearch.search_depth).toBe("advanced");
  });

  it("korean 쿼리가 없으면 3개 카테고리만 검색한다", async () => {
    mockFetch.mockResolvedValue(makeTavilyResponse([]));

    await searchTavily(DEFAULT_QUERIES);

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("korean 카테고리 결과에 category='korean' 라벨이 붙는다", async () => {
    let callIdx = 0;
    mockFetch.mockImplementation(() => {
      callIdx++;
      if (callIdx === 4) {
        return Promise.resolve(
          makeTavilyResponse([
            { title: "한국 결과", url: "https://korean.com", content: "내용", score: 0.8 },
          ])
        );
      }
      return Promise.resolve(makeTavilyResponse([]));
    });

    const result = await searchTavily({ ...DEFAULT_QUERIES, korean: "테스트" });
    const koreanResult = result.find((r) => r.url === "https://korean.com");
    expect(koreanResult?.category).toBe("korean");
  });
});

describe("searchTavily - API 키 없음", () => {
  it("TAVILY_API_KEY가 없으면 fetch 없이 빈 배열 반환", async () => {
    // 키 없는 모듈을 별도로 로드
    vi.doUnmock("@/lib/pipeline/search-tavily");
    const originalKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    // 새 모듈 인스턴스 로드 (캐시 우회)
    const mod = await import(
      "@/lib/pipeline/search-tavily?nokey=" + Date.now()
    );

    const result = await mod.searchTavily(DEFAULT_QUERIES);
    expect(result).toEqual([]);

    // 복원
    process.env.TAVILY_API_KEY = originalKey;
  });
});
