// ─── Dummy / Fallback 데이터 ───
// API 호출 실패 시 fallback으로 사용하거나, 테스트 fixtures로 활용합니다.

import type { KeywordExtraction, GitHubRepo, TavilyResult, RankedResults } from "./pipeline/types";
import type { ReportMeta } from "./report";

// ─── Phase 1: 키워드 추출 fallback ───

export function dummyExtraction(idea: string): KeywordExtraction {
  return {
    classification: "AMBIGUOUS",
    complexity: "MEDIUM",
    reason:
      "AI 분석 서비스에 일시적으로 연결할 수 없어 기본 분류를 적용했습니다. 검색은 아이디어 원문을 기반으로 진행됩니다.",
    github_queries: idea
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 3),
    github_queries_ko: [idea.slice(0, 50)],
    tavily_queries: {
      competitors: idea,
      trends: idea,
      technical: idea,
      korean: idea,
    },
    topics: [],
  };
}

// ─── Phase 2: GitHub 검색 fallback ───

export const DUMMY_GITHUB_REPOS: GitHubRepo[] = [
  {
    full_name: "vibcheck/검색결과없음",
    html_url: "#",
    description:
      "GitHub 검색에 일시적으로 연결할 수 없었습니다. 리포트는 제한된 정보로 생성됩니다.",
    stargazers_count: 0,
    language: null,
    topics: [],
    pushed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    open_issues_count: 0,
    license: null,
  },
];

// ─── Phase 3: Tavily 검색 fallback ───

export const DUMMY_TAVILY_RESULTS: TavilyResult[] = [
  {
    title: "웹 검색 결과 없음",
    url: "#",
    content:
      "웹 검색에 일시적으로 연결할 수 없었습니다. 리포트는 제한된 정보로 생성됩니다.",
    score: 0,
    category: "competitors",
  },
];

// ─── Phase 4: 리포트 생성 fallback ───

export function dummyReportMarkdown(idea: string): string {
  return `## 판정: 조건부 가능
**확신도:** 0.30

AI 리포트 생성 서비스에 일시적으로 연결할 수 없어 자동 분석을 완료하지 못했습니다.
입력하신 아이디어("${idea}")는 추후 다시 검증해 주세요.

## 필요 기술 스택
- 정보 부족 — AI 분석이 완료되지 않아 기술 스택을 추천할 수 없습니다

## 단계별 로드맵
1. **다시 시도** — 네트워크 상태를 확인한 후 동일 아이디어로 재검증하세요
2. **직접 조사** — [GitHub](https://github.com)에서 유사 프로젝트를 직접 검색해 보세요
3. **커뮤니티 활용** — [OKKY](https://okky.kr)에서 다른 개발자의 의견을 들어보세요

## 유사 프로젝트
| 이름 | 스타 | 기술스택 | 추천 |
|------|------|---------|------|
| (검색 실패) | — | — | 재시도 필요 |

## 시장/트렌드
- 분석 서비스 일시 장애로 시장 정보를 수집하지 못했습니다
- 잠시 후 다시 시도하면 정상적인 분석 결과를 받을 수 있습니다`;
}

export function dummyReportMeta(idea: string): ReportMeta {
  return {
    verdict: "조건부 가능",
    confidence: 0.3,
    sections: [
      {
        heading: "## 판정: 조건부 가능",
        content: `**확신도:** 0.30\n\nAI 리포트 생성 서비스에 일시적으로 연결할 수 없어 자동 분석을 완료하지 못했습니다.\n입력하신 아이디어("${idea}")는 추후 다시 검증해 주세요.`,
        isVerdict: true,
      },
      {
        heading: "## 필요 기술 스택",
        content:
          "- 정보 부족 — AI 분석이 완료되지 않아 기술 스택을 추천할 수 없습니다",
        isVerdict: false,
      },
      {
        heading: "## 단계별 로드맵",
        content:
          '1. **다시 시도** — 네트워크 상태를 확인한 후 동일 아이디어로 재검증하세요\n2. **직접 조사** — [GitHub](https://github.com)에서 유사 프로젝트를 직접 검색해 보세요\n3. **커뮤니티 활용** — [OKKY](https://okky.kr)에서 다른 개발자의 의견을 들어보세요',
        isVerdict: false,
      },
      {
        heading: "## 유사 프로젝트",
        content:
          "| 이름 | 스타 | 기술스택 | 추천 |\n|------|------|---------|------|\n| (검색 실패) | — | — | 재시도 필요 |",
        isVerdict: false,
      },
      {
        heading: "## 시장/트렌드",
        content:
          "- 분석 서비스 일시 장애로 시장 정보를 수집하지 못했습니다\n- 잠시 후 다시 시도하면 정상적인 분석 결과를 받을 수 있습니다",
        isVerdict: false,
      },
    ],
  };
}

// ─── Phase 4: 랭킹 fallback (검색 없이 빈 컨텍스트) ───

export function dummyRankedResults(): RankedResults {
  return {
    github: [],
    tavily: [],
    ecosystemSignal: "UNKNOWN",
    contextXml:
      '<ecosystem_signal type="UNKNOWN">검색 서비스 장애로 결과를 수집하지 못했습니다. 이는 아이디어의 가치와 무관한 기술적 장애입니다.</ecosystem_signal>',
  };
}
