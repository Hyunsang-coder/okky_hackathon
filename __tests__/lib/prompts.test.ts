import { describe, it, expect } from "vitest";
import { buildAnalysisUserPrompt, buildChatSystemPrompt } from "@/lib/prompts";
import type { KeywordExtraction } from "@/lib/pipeline/types";

function makeExtraction(
  overrides: Partial<KeywordExtraction> = {}
): KeywordExtraction {
  return {
    classification: "SEARCHABLE",
    complexity: "LOW",
    reason: "테스트 이유",
    github_queries: ["test query"],
    tavily_queries: {
      competitors: "competitor query",
      trends: "trend query",
      technical: "tech query",
    },
    topics: ["test"],
    ...overrides,
  };
}

describe("buildAnalysisUserPrompt", () => {
  it("아이디어를 XML 태그로 감싼다", () => {
    const result = buildAnalysisUserPrompt(
      "테스트 아이디어",
      makeExtraction(),
      "<context/>"
    );
    expect(result).toContain("<user_idea>테스트 아이디어</user_idea>");
  });

  it("LOW/MEDIUM 복잡도에서는 complexity_warning이 없다", () => {
    for (const complexity of ["LOW", "MEDIUM"] as const) {
      const result = buildAnalysisUserPrompt(
        "아이디어",
        makeExtraction({ complexity }),
        "<context/>"
      );
      expect(result).not.toContain("complexity_warning");
    }
  });

  it("HIGH 복잡도에서 complexity_warning을 포함한다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({ complexity: "HIGH" }),
      "<context/>"
    );
    expect(result).toContain('<complexity_warning level="HIGH">');
    expect(result).toContain("MVP 범위를 축소");
  });

  it("VERY_HIGH 복잡도에서 complexity_warning을 포함한다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({ complexity: "VERY_HIGH" }),
      "<context/>"
    );
    expect(result).toContain('<complexity_warning level="VERY_HIGH">');
  });

  it("UNAVAILABLE 데이터 의존성이 있으면 경고를 포함한다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({
        data_dependencies: [
          { name: "국민건강 API", status: "UNAVAILABLE", detail: "존재하지 않음" },
        ],
      }),
      "<context/>"
    );
    expect(result).toContain("<data_dependency_warning>");
    expect(result).toContain("국민건강 API");
    expect(result).toContain('status="UNAVAILABLE"');
  });

  it("AVAILABLE 데이터 의존성만 있으면 경고가 없다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({
        data_dependencies: [
          { name: "OpenAI API", status: "AVAILABLE_FREE", detail: "사용 가능" },
        ],
      }),
      "<context/>"
    );
    expect(result).not.toContain("<data_dependency_warning>");
  });

  it("AMBIGUOUS 분류에서 caution을 포함한다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({ classification: "AMBIGUOUS" }),
      "<context/>"
    );
    expect(result).toContain("<caution>");
    expect(result).toContain("해석에 따라");
  });

  it("SEARCHABLE 분류에서는 caution이 없다", () => {
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction({ classification: "SEARCHABLE" }),
      "<context/>"
    );
    expect(result).not.toContain("<caution>");
  });

  it("contextXml이 마지막에 포함된다", () => {
    const contextXml = "<search_results>data</search_results>";
    const result = buildAnalysisUserPrompt(
      "아이디어",
      makeExtraction(),
      contextXml
    );
    expect(result).toContain(contextXml);
    expect(result).toContain("검색 결과를 기반으로");
  });

  it("모든 조건이 동시에 활성화될 수 있다", () => {
    const result = buildAnalysisUserPrompt(
      "복합 아이디어",
      makeExtraction({
        classification: "AMBIGUOUS",
        complexity: "VERY_HIGH",
        data_dependencies: [
          { name: "없는 API", status: "UNAVAILABLE", detail: "없음" },
        ],
      }),
      "<context/>"
    );
    expect(result).toContain("complexity_warning");
    expect(result).toContain("data_dependency_warning");
    expect(result).toContain("<caution>");
  });
});

describe("REPORT_SYSTEM_PROMPT - confidence 가이드라인", () => {
  it("확신도 산출 기준표가 포함되어 있다", async () => {
    const { REPORT_SYSTEM_PROMPT } = await import("@/lib/prompts");
    expect(REPORT_SYSTEM_PROMPT).toContain("확신도(confidence) 산출 기준");
    expect(REPORT_SYSTEM_PROMPT).toContain("0.85~0.95");
    expect(REPORT_SYSTEM_PROMPT).toContain("0.30 이하");
    expect(REPORT_SYSTEM_PROMPT).toContain("UNKNOWN");
  });
});

describe("buildChatSystemPrompt", () => {
  it("리포트와 컨텍스트를 플레이스홀더에 삽입한다", () => {
    const result = buildChatSystemPrompt("리포트 내용", "검색 컨텍스트");
    expect(result).toContain("<previous_report>\n리포트 내용\n</previous_report>");
    expect(result).toContain("<search_context>\n검색 컨텍스트\n</search_context>");
    expect(result).not.toContain("{REPORT}");
    expect(result).not.toContain("{CONTEXT}");
  });
});
