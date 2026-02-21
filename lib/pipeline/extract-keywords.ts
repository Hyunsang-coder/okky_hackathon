import { generateObject } from "ai";
import { z } from "zod";
import { fastModel } from "@/lib/models";
import type { KeywordExtraction } from "./types";

const KeywordExtractionSchema = z.object({
  classification: z.enum(["SEARCHABLE", "IMPOSSIBLE", "AMBIGUOUS"]),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]).optional(),
  data_dependencies: z
    .array(
      z.object({
        name: z.string(),
        status: z.enum([
          "AVAILABLE_FREE",
          "AVAILABLE_PAID",
          "BUILDABLE",
          "UNAVAILABLE",
        ]),
        detail: z.string(),
      })
    )
    .optional(),
  platform_risk: z
    .object({
      status: z.enum([
        "NONE",
        "OPEN",
        "REVIEW_REQUIRED",
        "ENTERPRISE_ONLY",
        "DEPRECATED",
      ]),
      platform: z.string(),
      detail: z.string(),
    })
    .optional(),
  legal_risks: z
    .array(
      z.object({
        severity: z.enum(["NONE", "CAUTION", "HIGH_RISK"]),
        category: z.enum(["개인정보", "저작권", "초상권", "약관위반", "기타"]),
        detail: z.string(),
      })
    )
    .optional(),
  reason: z.string(),
  alternative: z.string().optional(),
  github_queries: z.array(z.string()),
  tavily_queries: z.object({
    competitors: z.string(),
    trends: z.string(),
    technical: z.string(),
  }),
  topics: z.array(z.string()),
});

const KEYWORD_EXTRACTION_PROMPT = `사용자의 아이디어를 분석하라.

1단계: 아이디어 타당성 분류
아래 중 하나로 분류하라:
- "SEARCHABLE" — 현존하는 기술로 구현 가능성이 있어 검색할 가치가 있음
- "IMPOSSIBLE" — 물리법칙, 생물학적 한계, 현존 기술의 근본적 한계로 불가능
- "AMBIGUOUS" — 해석에 따라 가능할 수 있어 검색으로 확인 필요

2단계: 구현 복잡도 평가 (SEARCHABLE/AMBIGUOUS만)
- "LOW" — API 조합만으로 구현 가능 (CRUD, 외부 API 호출 수준)
- "MEDIUM" — 일부 기술 학습이 필요하지만 가이드가 충분함
- "HIGH" — 전문 알고리즘, 인프라 설계, 실시간 처리 등 고도 기술 필요
- "VERY_HIGH" — 연구 수준의 구현이 필요 (논문 구현, 커스텀 ML 모델 등)

3단계: 데이터/API 의존성 평가 (SEARCHABLE/AMBIGUOUS만)
이 아이디어가 작동하려면 어떤 외부 데이터나 API가 필요한지 파악하라.
각 의존성에 대해 가용 상태를 분류하라:
- "AVAILABLE_FREE" — 무료로 사용 가능한 공개 API 존재
- "AVAILABLE_PAID" — 유료 API 존재
- "BUILDABLE" — API는 없지만 직접 데이터 수집/구축 가능
- "UNAVAILABLE" — 해당 데이터 자체가 존재하지 않거나 접근 불가

4단계: 플랫폼 종속 리스크 평가 (SEARCHABLE/AMBIGUOUS만)
아이디어가 특정 플랫폼의 API에 의존하는 경우, 해당 플랫폼의 접근 정책을 평가하라:
- "NONE" — 특정 플랫폼에 종속되지 않음
- "OPEN" — 공개 API가 존재하고 개인 개발자도 자유롭게 사용 가능
- "REVIEW_REQUIRED" — API 사용 시 심사/승인이 필요 (예: Meta Graph API 앱 심사)
- "ENTERPRISE_ONLY" — 기업 계약이 필요하여 개인 개발자 접근 불가 (예: Twitter Firehose)
- "DEPRECATED" — 해당 API가 폐기되었거나 폐기 예정

5단계: 법적/규제 리스크 평가 (SEARCHABLE/AMBIGUOUS만)
아이디어가 법적 리스크를 수반하는지 평가하라. 해당하는 항목을 모두 나열하라:
- "NONE" — 법적 리스크 없음
- "CAUTION" — 주의가 필요한 법적 이슈 존재 (예: 개인정보 수집 시 동의 필요)
- "HIGH_RISK" — 심각한 법적 리스크 (예: 저작권 침해, 초상권 침해, 약관 위반)
카테고리: "개인정보", "저작권", "초상권", "약관위반", "기타"

6단계: 분류 결과에 따라
- SEARCHABLE/AMBIGUOUS → 검색 키워드를 추출. 도메인 키워드, 기술 키워드, 유의어, GitHub topic 후보를 다양하게 추출하라.
- IMPOSSIBLE → 불가능 이유와 대안 아이디어를 제시. github_queries, tavily_queries, topics는 빈 배열/객체로 반환.

키워드 추출 시 주의사항:
- github_queries: 영어로 3~5개, 각각 다른 관점 (도메인, 기술, 유의어). "in:description,readme" 같은 한정자는 포함하지 말 것.
- tavily_queries: 각 카테고리별 자연어 검색 쿼리. 영어로 작성.
- topics: GitHub topic 태그 형식 (소문자, 하이픈). 2~4개.`;

export async function extractKeywords(
  idea: string
): Promise<KeywordExtraction> {
  const { object } = await generateObject({
    model: fastModel,
    schema: KeywordExtractionSchema,
    system: KEYWORD_EXTRACTION_PROMPT,
    prompt: `사용자 아이디어: ${idea}`,
  });

  return object as KeywordExtraction;
}
