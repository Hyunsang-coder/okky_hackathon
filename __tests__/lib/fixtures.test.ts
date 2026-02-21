import { describe, it, expect } from "vitest";
import { parseReport, isVerdict } from "@/lib/report";
import {
  dummyExtraction,
  dummyReportMarkdown,
  dummyReportMeta,
  dummyRankedResults,
  DUMMY_GITHUB_REPOS,
  DUMMY_TAVILY_RESULTS,
} from "@/lib/fixtures";

describe("dummyExtraction", () => {
  it("AMBIGUOUS / MEDIUM 분류를 반환한다", () => {
    const result = dummyExtraction("테스트 아이디어");
    expect(result.classification).toBe("AMBIGUOUS");
    expect(result.complexity).toBe("MEDIUM");
  });

  it("아이디어에서 단어를 추출하여 github_queries를 생성한다", () => {
    const result = dummyExtraction("실시간 교통 예측 내비게이션");
    expect(result.github_queries.length).toBeGreaterThan(0);
    expect(result.github_queries.length).toBeLessThanOrEqual(3);
    for (const q of result.github_queries) {
      expect(q.length).toBeGreaterThan(1);
    }
  });

  it("한 글자 단어는 필터링한다", () => {
    const result = dummyExtraction("A 큰 프로젝트 B");
    expect(result.github_queries).not.toContain("A");
    expect(result.github_queries).not.toContain("B");
  });

  it("tavily_queries에 아이디어 원문을 그대로 넣는다", () => {
    const idea = "반려동물 건강 앱";
    const result = dummyExtraction(idea);
    expect(result.tavily_queries.competitors).toBe(idea);
    expect(result.tavily_queries.trends).toBe(idea);
    expect(result.tavily_queries.technical).toBe(idea);
    expect(result.tavily_queries.korean).toBe(idea);
  });

  it("github_queries_ko에 아이디어 원문 일부를 넣는다", () => {
    const idea = "반려동물 건강 앱";
    const result = dummyExtraction(idea);
    expect(result.github_queries_ko).toBeDefined();
    expect(result.github_queries_ko!.length).toBeGreaterThan(0);
  });

  it("topics는 빈 배열이다", () => {
    expect(dummyExtraction("test").topics).toEqual([]);
  });

  it("빈 문자열도 크래시 없이 처리한다", () => {
    const result = dummyExtraction("");
    expect(result.github_queries).toEqual([]);
    expect(result.classification).toBe("AMBIGUOUS");
  });
});

describe("dummyReportMarkdown", () => {
  it("유효한 마크다운 리포트를 생성한다", () => {
    const md = dummyReportMarkdown("테스트 아이디어");
    expect(md).toContain("## 판정: 조건부 가능");
    expect(md).toContain("**확신도:** 0.30");
    expect(md).toContain("## 필요 기술 스택");
    expect(md).toContain("## 단계별 로드맵");
    expect(md).toContain("## 유사 프로젝트");
    expect(md).toContain("## 시장/트렌드");
  });

  it("아이디어 텍스트가 리포트에 포함된다", () => {
    const idea = "AI 요리 추천 앱";
    const md = dummyReportMarkdown(idea);
    expect(md).toContain(idea);
  });

  it("parseReport로 파싱 가능한 형식이다", () => {
    const md = dummyReportMarkdown("테스트");
    const parsed = parseReport(md);
    expect(parsed.verdict).toBe("조건부 가능");
    expect(parsed.confidence).toBe(0.3);
    expect(parsed.sections.length).toBe(5);
  });
});

describe("dummyReportMeta", () => {
  it("verdict가 유효한 판정값이다", () => {
    const meta = dummyReportMeta("테스트");
    expect(meta.verdict).toBe("조건부 가능");
    expect(isVerdict(meta.verdict!)).toBe(true);
  });

  it("confidence가 0~1 범위이다", () => {
    const meta = dummyReportMeta("테스트");
    expect(meta.confidence).toBeGreaterThanOrEqual(0);
    expect(meta.confidence).toBeLessThanOrEqual(1);
  });

  it("5개 섹션을 포함한다", () => {
    const meta = dummyReportMeta("테스트");
    expect(meta.sections).toHaveLength(5);
  });

  it("첫 섹션이 isVerdict: true이다", () => {
    const meta = dummyReportMeta("테스트");
    expect(meta.sections[0].isVerdict).toBe(true);
  });

  it("나머지 섹션은 isVerdict: false이다", () => {
    const meta = dummyReportMeta("테스트");
    for (const section of meta.sections.slice(1)) {
      expect(section.isVerdict).toBe(false);
    }
  });

  it("아이디어 텍스트가 verdict 섹션 content에 포함된다", () => {
    const idea = "블록체인 투표 시스템";
    const meta = dummyReportMeta(idea);
    expect(meta.sections[0].content).toContain(idea);
  });

  it("markdown과 meta의 판정/확신도가 일치한다", () => {
    const idea = "테스트 아이디어";
    const md = dummyReportMarkdown(idea);
    const meta = dummyReportMeta(idea);
    const parsed = parseReport(md);

    expect(parsed.verdict).toBe(meta.verdict);
    expect(parsed.confidence).toBe(meta.confidence);
    expect(parsed.sections.length).toBe(meta.sections.length);
  });
});

describe("dummyRankedResults", () => {
  it("빈 github/tavily 배열을 반환한다", () => {
    const result = dummyRankedResults();
    expect(result.github).toEqual([]);
    expect(result.tavily).toEqual([]);
  });

  it("UNKNOWN 시그널이다", () => {
    expect(dummyRankedResults().ecosystemSignal).toBe("UNKNOWN");
  });

  it("contextXml에 장애 안내가 포함된다", () => {
    const result = dummyRankedResults();
    expect(result.contextXml).toContain("ecosystem_signal");
    expect(result.contextXml).toContain("UNKNOWN");
    expect(result.contextXml).toContain("장애");
  });
});

describe("DUMMY_GITHUB_REPOS", () => {
  it("1개 placeholder 레포를 포함한다", () => {
    expect(DUMMY_GITHUB_REPOS).toHaveLength(1);
  });

  it("GitHubRepo 필수 필드를 모두 갖는다", () => {
    const repo = DUMMY_GITHUB_REPOS[0];
    expect(repo.full_name).toBeTruthy();
    expect(repo.html_url).toBeTruthy();
    expect(repo.description).toBeTruthy();
    expect(typeof repo.stargazers_count).toBe("number");
    expect(Array.isArray(repo.topics)).toBe(true);
    expect(repo.pushed_at).toBeTruthy();
    expect(repo.created_at).toBeTruthy();
  });
});

describe("DUMMY_TAVILY_RESULTS", () => {
  it("1개 placeholder 결과를 포함한다", () => {
    expect(DUMMY_TAVILY_RESULTS).toHaveLength(1);
  });

  it("TavilyResult 필수 필드를 모두 갖는다", () => {
    const result = DUMMY_TAVILY_RESULTS[0];
    expect(result.title).toBeTruthy();
    expect(result.url).toBeTruthy();
    expect(result.content).toBeTruthy();
    expect(typeof result.score).toBe("number");
    expect(["competitors", "trends", "technical", "korean"]).toContain(result.category);
  });
});
