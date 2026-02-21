import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitHubRepo } from "@/lib/pipeline/types";

// fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// atob mock (README base64 디코딩)
vi.stubGlobal("atob", (s: string) => Buffer.from(s, "base64").toString());

const { searchGitHub } = await import("@/lib/pipeline/search-github");

function makeGitHubRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    full_name: "user/repo",
    html_url: "https://github.com/user/repo",
    description: "A test repo",
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

function mockSearchResponse(items: GitHubRepo[], totalCount?: number) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        total_count: totalCount ?? items.length,
        items,
      }),
  };
}

function mockReadmeResponse(content: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        content: Buffer.from(content).toString("base64"),
      }),
  };
}

function mockJsonResponse(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) };
}

function mockFailedResponse() {
  return { ok: false, json: () => Promise.resolve({}) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("searchGitHub", () => {
  it("쿼리가 비어있으면 NOVEL 시그널과 빈 배열 반환", async () => {
    const result = await searchGitHub([], []);
    expect(result.repos).toHaveLength(0);
    expect(result.signal).toBe("NOVEL");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("strict 검색에서 3개 이상 발견되면 ESTABLISHED 시그널", async () => {
    const repos = [
      makeGitHubRepo({ full_name: "a/repo1", stargazers_count: 500 }),
      makeGitHubRepo({ full_name: "b/repo2", stargazers_count: 300 }),
      makeGitHubRepo({ full_name: "c/repo3", stargazers_count: 100 }),
    ];

    // strict search: 각 쿼리에 대한 응답 + readme 요청
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(mockSearchResponse(repos));
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# Test README content"));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["test query"], ["test-topic"]);

    expect(result.signal).toBe("ESTABLISHED");
    expect(result.repos.length).toBeGreaterThanOrEqual(3);
  });

  it("strict 검색에서 부족하면 broad 검색으로 폴백하여 EMERGING", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        // strict 검색 (stars:>10) → 빈 결과, broad 검색 (stars:>1) → 결과 있음
        const isStrictSearch = url.includes(encodeURIComponent("stars:>10"));
        if (isStrictSearch) {
          return Promise.resolve(mockSearchResponse([]));
        }
        return Promise.resolve(
          mockSearchResponse([
            makeGitHubRepo({ full_name: "small/project", stargazers_count: 5 }),
          ])
        );
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# Small project"));
      }
      if (url.includes("/commits")) {
        return Promise.resolve(
          mockJsonResponse([
            { commit: { committer: { date: "2025-01-01T00:00:00Z" } } },
          ])
        );
      }
      if (url.includes("/languages")) {
        return Promise.resolve(mockJsonResponse({ TypeScript: 1000 }));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["niche query"], []);

    expect(result.signal).toBe("EMERGING");
    expect(result.repos.length).toBeGreaterThanOrEqual(1);
  });

  it("strict/broad 모두 빈 결과면 NOVEL 시그널", async () => {
    mockFetch.mockResolvedValue(mockSearchResponse([]));

    const result = await searchGitHub(["nonexistent query"], []);

    expect(result.signal).toBe("NOVEL");
    expect(result.repos).toHaveLength(0);
  });

  it("중복 레포를 query_hits로 병합한다", async () => {
    const sharedRepo = makeGitHubRepo({
      full_name: "shared/repo",
      stargazers_count: 200,
    });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(mockSearchResponse([sharedRepo]));
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# README"));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(
      ["query1", "query2", "query3"],
      []
    );

    // 같은 레포가 여러 쿼리에서 발견되면 하나로 병합
    const found = result.repos.filter((r) => r.full_name === "shared/repo");
    expect(found).toHaveLength(1);
    expect(found[0].query_hits).toBeGreaterThanOrEqual(1);
  });

  it("결과를 스타 수 내림차순으로 정렬한다", async () => {
    const repos = [
      makeGitHubRepo({ full_name: "low/repo", stargazers_count: 10 }),
      makeGitHubRepo({ full_name: "high/repo", stargazers_count: 5000 }),
      makeGitHubRepo({ full_name: "mid/repo", stargazers_count: 500 }),
    ];

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(mockSearchResponse(repos));
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# README"));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["test"], []);

    expect(result.repos[0].full_name).toBe("high/repo");
    expect(result.repos[1].full_name).toBe("mid/repo");
    expect(result.repos[2].full_name).toBe("low/repo");
  });

  it("상위 레포에 README excerpt를 보강한다", async () => {
    const readmeContent = "# Project\nThis is a great project with lots of features.";

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(
          mockSearchResponse([makeGitHubRepo({ full_name: "test/project" })])
        );
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse(readmeContent));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["test"], []);

    const repo = result.repos.find((r) => r.full_name === "test/project");
    expect(repo?.readme_excerpt).toBe(readmeContent);
  });

  it("EMERGING 시그널에서 activity 정보를 보강한다", async () => {
    const commitDate = "2025-06-15T00:00:00Z";

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        // strict: 빈 결과 → broad: 결과 있음
        if (url.includes("stars%3E10")) {
          return Promise.resolve(mockSearchResponse([]));
        }
        return Promise.resolve(
          mockSearchResponse([
            makeGitHubRepo({
              full_name: "emerging/project",
              stargazers_count: 5,
            }),
          ])
        );
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# README"));
      }
      if (url.includes("/commits")) {
        return Promise.resolve(
          mockJsonResponse([
            { commit: { committer: { date: commitDate } } },
          ])
        );
      }
      if (url.includes("/languages")) {
        return Promise.resolve(
          mockJsonResponse({ Python: 5000, JavaScript: 2000 })
        );
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["emerging topic"], []);

    expect(result.signal).toBe("EMERGING");
    const repo = result.repos.find(
      (r) => r.full_name === "emerging/project"
    );
    expect(repo?.recent_commit_date).toBe(commitDate);
    expect(repo?.languages).toEqual({ Python: 5000, JavaScript: 2000 });
  });

  it("topic 쿼리를 검색에 포함한다", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(
          mockSearchResponse([
            makeGitHubRepo({ full_name: "topic/repo", stargazers_count: 50 }),
          ])
        );
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# README"));
      }
      return Promise.resolve(mockFailedResponse());
    });

    await searchGitHub(["main query"], ["react-native", "mobile-app"]);

    const searchCalls = mockFetch.mock.calls
      .map((c) => c[0] as string)
      .filter((url) => url.includes("search/repositories"));

    // topic:react-native 또는 topic:mobile-app이 쿼리에 포함되어야 함
    const hasTopicQuery = searchCalls.some(
      (url) => url.includes("topic") && url.includes("search")
    );
    expect(hasTopicQuery).toBe(true);
  });

  it("최대 10개 레포만 반환한다", async () => {
    const repos = Array.from({ length: 15 }, (_, i) =>
      makeGitHubRepo({
        full_name: `user/repo-${i}`,
        stargazers_count: 1000 - i * 10,
      })
    );

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(mockSearchResponse(repos));
      }
      if (url.includes("/readme")) {
        return Promise.resolve(mockReadmeResponse("# README"));
      }
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["test"], []);

    expect(result.repos.length).toBeLessThanOrEqual(10);
  });

  it("검색 API 실패 시 빈 결과로 처리한다", async () => {
    mockFetch.mockResolvedValue(mockFailedResponse());

    const result = await searchGitHub(["failing query"], []);

    expect(result.signal).toBe("NOVEL");
    expect(result.repos).toHaveLength(0);
  });

  it("README 실패 시에도 레포는 반환한다", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(
          mockSearchResponse([
            makeGitHubRepo({ full_name: "test/no-readme" }),
          ])
        );
      }
      // README 요청 실패
      return Promise.resolve(mockFailedResponse());
    });

    const result = await searchGitHub(["test"], []);

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].readme_excerpt).toBeUndefined();
  });

  it("쿼리를 최대 5개로 제한한다 (queries 4 + topics 2, cap 5)", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("search/repositories")) {
        return Promise.resolve(mockSearchResponse([]));
      }
      return Promise.resolve(mockFailedResponse());
    });

    await searchGitHub(
      ["q1", "q2", "q3", "q4", "q5"],
      ["t1", "t2", "t3"]
    );

    // strict 검색에서 최대 5개 쿼리
    const strictSearchCalls = mockFetch.mock.calls
      .map((c) => c[0] as string)
      .filter((url) => url.includes("search/repositories"));
    expect(strictSearchCalls.length).toBeLessThanOrEqual(10); // strict 5 + broad 5
  });
});
