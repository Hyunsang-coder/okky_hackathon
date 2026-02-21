import { describe, it, expect } from "vitest";
import { rankResults } from "@/lib/pipeline/rank-results";
import type {
  GitHubRepo,
  TavilyResult,
  EcosystemSignalType,
} from "@/lib/pipeline/types";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    full_name: "user/repo",
    html_url: "https://github.com/user/repo",
    description: "A test repository",
    stargazers_count: 100,
    language: "TypeScript",
    topics: ["test"],
    pushed_at: new Date().toISOString(),
    created_at: "2024-01-01T00:00:00Z",
    open_issues_count: 5,
    license: { spdx_id: "MIT" },
    ...overrides,
  };
}

function makeTavily(overrides: Partial<TavilyResult> = {}): TavilyResult {
  return {
    title: "Test Article",
    url: "https://example.com",
    content: "Test content about the topic",
    score: 0.8,
    category: "competitors",
    ...overrides,
  };
}

describe("rankResults", () => {
  it("GitHub 레포를 점수순으로 정렬한다", () => {
    const repos = [
      makeRepo({ full_name: "low/stars", stargazers_count: 1 }),
      makeRepo({ full_name: "high/stars", stargazers_count: 10000 }),
      makeRepo({ full_name: "mid/stars", stargazers_count: 500 }),
    ];

    const result = rankResults(repos, [], "ESTABLISHED", []);
    expect(result.github[0].full_name).toBe("high/stars");
    expect(result.github[2].full_name).toBe("low/stars");
  });

  it("contextXml에 ecosystem_signal이 포함된다", () => {
    const result = rankResults([], [], "NOVEL", []);
    expect(result.contextXml).toContain('ecosystem_signal type="NOVEL"');
  });

  it("ESTABLISHED 시그널 메시지 확인", () => {
    const result = rankResults([], [], "ESTABLISHED", []);
    expect(result.contextXml).toContain("성숙한 오픈소스");
  });

  it("EMERGING 시그널 메시지 확인", () => {
    const result = rankResults([], [], "EMERGING", []);
    expect(result.contextXml).toContain("초기 단계");
  });

  it("NOVEL 시그널 메시지 확인", () => {
    const result = rankResults([], [], "NOVEL", []);
    expect(result.contextXml).toContain("발견되지 않았습니다");
  });

  it("키워드 매칭이 점수에 반영된다", () => {
    const withMatch = makeRepo({
      full_name: "match/repo",
      description: "image analysis tool for photos",
      stargazers_count: 50,
    });
    const noMatch = makeRepo({
      full_name: "nomatch/repo",
      description: "unrelated project",
      stargazers_count: 50,
    });

    const result = rankResults(
      [withMatch, noMatch],
      [],
      "ESTABLISHED",
      ["image", "analysis"]
    );
    const matchScore = result.github.find(
      (r) => r.full_name === "match/repo"
    )!.score!;
    const noMatchScore = result.github.find(
      (r) => r.full_name === "nomatch/repo"
    )!.score!;
    expect(matchScore).toBeGreaterThan(noMatchScore);
  });

  it("multi-query boost가 적용된다", () => {
    const singleHit = makeRepo({
      full_name: "single/hit",
      query_hits: 1,
      stargazers_count: 100,
    });
    const multiHit = makeRepo({
      full_name: "multi/hit",
      query_hits: 4,
      stargazers_count: 100,
    });

    const result = rankResults(
      [singleHit, multiHit],
      [],
      "ESTABLISHED",
      []
    );
    const multiScore = result.github.find(
      (r) => r.full_name === "multi/hit"
    )!.score!;
    const singleScore = result.github.find(
      (r) => r.full_name === "single/hit"
    )!.score!;
    expect(multiScore).toBeGreaterThan(singleScore);
  });

  it("라이센스가 있는 레포가 더 높은 점수를 받는다", () => {
    const withLicense = makeRepo({
      full_name: "with/license",
      license: { spdx_id: "MIT" },
      stargazers_count: 100,
    });
    const noLicense = makeRepo({
      full_name: "no/license",
      license: null,
      stargazers_count: 100,
    });

    const result = rankResults(
      [withLicense, noLicense],
      [],
      "ESTABLISHED",
      []
    );
    const withScore = result.github.find(
      (r) => r.full_name === "with/license"
    )!.score!;
    const noScore = result.github.find(
      (r) => r.full_name === "no/license"
    )!.score!;
    expect(withScore).toBeGreaterThan(noScore);
  });

  it("contextXml에 GitHub/Tavily 결과가 포함된다", () => {
    const repos = [makeRepo()];
    const tavily = [makeTavily()];
    const result = rankResults(repos, tavily, "ESTABLISHED", []);

    expect(result.contextXml).toContain("<github_results>");
    expect(result.contextXml).toContain("user/repo");
    expect(result.contextXml).toContain("<web_results>");
    expect(result.contextXml).toContain("Test Article");
  });

  it("GitHub 결과 8개까지만 contextXml에 포함", () => {
    const repos = Array.from({ length: 12 }, (_, i) =>
      makeRepo({ full_name: `user/repo-${i}` })
    );
    const result = rankResults(repos, [], "ESTABLISHED", []);

    const repoTags = result.contextXml.match(/<repo /g) || [];
    expect(repoTags).toHaveLength(8);
  });

  it("Tavily 결과 10개까지만 contextXml에 포함", () => {
    const tavily = Array.from({ length: 15 }, (_, i) =>
      makeTavily({ title: `Article ${i}` })
    );
    const result = rankResults([], tavily, "ESTABLISHED", []);

    const sourceTags = result.contextXml.match(/<source /g) || [];
    expect(sourceTags).toHaveLength(10);
  });

  it("EMERGING에서는 recent_commit_date가 점수에 반영된다", () => {
    const active = makeRepo({
      full_name: "active/repo",
      recent_commit_date: new Date().toISOString(),
      stargazers_count: 10,
    });
    const stale = makeRepo({
      full_name: "stale/repo",
      recent_commit_date: "2020-01-01T00:00:00Z",
      stargazers_count: 10,
    });

    const result = rankResults(
      [active, stale],
      [],
      "EMERGING",
      []
    );
    const activeScore = result.github.find(
      (r) => r.full_name === "active/repo"
    )!.score!;
    const staleScore = result.github.find(
      (r) => r.full_name === "stale/repo"
    )!.score!;
    expect(activeScore).toBeGreaterThan(staleScore);
  });

  it("빈 입력을 처리한다", () => {
    const result = rankResults([], [], "NOVEL", []);
    expect(result.github).toHaveLength(0);
    expect(result.tavily).toHaveLength(0);
    expect(result.ecosystemSignal).toBe("NOVEL");
    expect(result.contextXml).toBeTruthy();
  });
});
