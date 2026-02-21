import { streamText } from "ai";
import { defaultModel, thinkingModel } from "@/lib/models";
import { extractKeywords } from "@/lib/pipeline/extract-keywords";
import { searchGitHub } from "@/lib/pipeline/search-github";
import { searchTavily } from "@/lib/pipeline/search-tavily";
import { rankResults } from "@/lib/pipeline/rank-results";
import {
  REPORT_SYSTEM_PROMPT,
  IMPOSSIBLE_REPORT_PROMPT,
  buildAnalysisUserPrompt,
} from "@/lib/prompts";
import { encodeSSE, encodeProgress, encodeDone } from "@/lib/sse";
import { parseReport } from "@/lib/report";
import {
  dummyExtraction,
  dummyReportMarkdown,
  dummyReportMeta,
} from "@/lib/fixtures";
import {
  keywordCache,
  githubCache,
  tavilyCache,
  keywordCacheKey,
  githubCacheKey,
  tavilyCacheKey,
} from "@/lib/cache";
import type { KeywordExtraction } from "@/lib/pipeline/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { idea } = await req.json();

  if (!idea || typeof idea !== "string") {
    return new Response(JSON.stringify({ error: "idea is required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => controller.enqueue(encoder.encode(msg));

      try {
        // Phase 0+1: Keyword extraction
        send(encodeProgress("keywords", "started", "아이디어 분석 중..."));
        let extraction: KeywordExtraction;
        const kwKey = keywordCacheKey(idea);
        const cachedKw = keywordCache.get(kwKey) as KeywordExtraction | undefined;
        if (cachedKw) {
          extraction = cachedKw;
          send(
            encodeProgress(
              "keywords",
              "completed",
              `"${extraction.classification}" 분류 완료 (캐시)`,
            )
          );
        } else {
          try {
            extraction = await extractKeywords(idea);
            keywordCache.set(kwKey, extraction);
            send(
              encodeProgress(
                "keywords",
                "completed",
                `"${extraction.classification}" 분류 완료`,
              )
            );
          } catch {
            extraction = dummyExtraction(idea);
            send(
              encodeProgress(
                "keywords",
                "error",
                "AI 분석 실패 — 기본 분류로 진행합니다",
              )
            );
          }
        }

        // IMPOSSIBLE case: skip search, generate short report
        if (extraction.classification === "IMPOSSIBLE") {
          // Skip search steps
          send(encodeProgress("github", "completed", "검색 생략"));
          send(encodeProgress("tavily", "completed", "검색 생략"));
          send(encodeProgress("ranking", "completed", "검색 생략"));

          send(
            encodeProgress(
              "report",
              "started",
              "단축 리포트 생성 중...",
            )
          );

          try {
            const result = streamText({
              model: defaultModel,
              system: IMPOSSIBLE_REPORT_PROMPT,
              prompt: `사용자 아이디어: ${idea}\n\n사전 심사 결과:\n- 분류: IMPOSSIBLE\n- 이유: ${extraction.reason}\n- 대안 제안: ${extraction.alternative || "없음"}`,
            });

            let fullReport = "";
            for await (const chunk of result.textStream) {
              fullReport += chunk;
              send(encodeSSE({ type: "text", data: chunk }));
            }

            send(encodeProgress("report", "completed"));
            send(
              encodeSSE({ type: "report-meta", data: parseReport(fullReport) }),
            );
          } catch {
            const fallback = dummyReportMarkdown(idea);
            send(encodeSSE({ type: "text", data: fallback }));
            send(encodeProgress("report", "error", "리포트 생성 실패 — 기본 리포트를 표시합니다"));
            send(encodeSSE({ type: "report-meta", data: dummyReportMeta(idea) }));
          }

          send(encodeSSE({ type: "context", data: "" }));
          send(encodeDone());
          controller.close();
          return;
        }

        // SEARCHABLE / AMBIGUOUS: proceed with search
        // GitHub + Tavily in parallel (with cache)
        const ghKey = githubCacheKey(extraction.github_queries, extraction.topics, extraction.github_queries_ko);
        const tvKey = tavilyCacheKey(extraction.tavily_queries);

        const cachedGh = githubCache.get(ghKey) as { repos: import("@/lib/pipeline/types").GitHubRepo[]; signal: import("@/lib/pipeline/types").EcosystemSignalType } | undefined;
        const cachedTv = tavilyCache.get(tvKey) as import("@/lib/pipeline/types").TavilyResult[] | undefined;

        send(encodeProgress("github", "started", cachedGh ? "캐시에서 로드 중..." : "유사 프로젝트 검색 중..."));
        send(encodeProgress("tavily", "started", cachedTv ? "캐시에서 로드 중..." : "시장 정보 수집 중..."));

        const [githubResult, tavilyResult] = await Promise.allSettled([
          cachedGh
            ? Promise.resolve(cachedGh)
            : searchGitHub(extraction.github_queries, extraction.topics, extraction.github_queries_ko).then((r) => {
                githubCache.set(ghKey, r);
                return r;
              }),
          cachedTv
            ? Promise.resolve(cachedTv)
            : searchTavily(extraction.tavily_queries).then((r) => {
                tavilyCache.set(tvKey, r);
                return r;
              }),
        ]);

        const githubFailed = !cachedGh && githubResult.status === "rejected";
        const tavilyFailed = !cachedTv && tavilyResult.status === "rejected";

        const github =
          githubResult.status === "fulfilled"
            ? githubResult.value
            : { repos: [], signal: "UNKNOWN" as const };
        const tavily =
          tavilyResult.status === "fulfilled" ? tavilyResult.value : [];

        // 둘 다 실패한 경우 시그널을 UNKNOWN으로 강제 (NOVEL과 혼동 방지)
        if (githubFailed && tavilyFailed) {
          github.signal = "UNKNOWN";
        }

        const ghDetail = cachedGh
          ? `${github.repos.length}개 프로젝트 발견 (${github.signal}) (캐시)`
          : `${github.repos.length}개 프로젝트 발견 (${github.signal})`;
        const tvDetail = cachedTv
          ? `${tavily.length}개 자료 발견 (캐시)`
          : `${tavily.length}개 자료 발견`;

        send(
          encodeProgress(
            "github",
            githubFailed ? "error" : "completed",
            githubFailed
              ? "GitHub 검색 실패 — 제한된 정보로 분석합니다"
              : ghDetail,
          )
        );
        send(
          encodeProgress(
            "tavily",
            tavilyFailed ? "error" : "completed",
            tavilyFailed
              ? "웹 검색 실패 — 제한된 정보로 분석합니다"
              : tvDetail,
          )
        );

        // Ranking
        send(encodeProgress("ranking", "started", "검색 결과 정리 중..."));
        const keywords = extraction.github_queries.flatMap((q) =>
          q.split(" ")
        );
        const ranked = rankResults(
          github.repos,
          tavily,
          github.signal,
          keywords
        );
        send(encodeProgress("ranking", "completed"));

        // Report generation
        send(encodeProgress("report", "started", "AI 리포트 생성 중..."));

        const userPrompt = buildAnalysisUserPrompt(
          idea,
          extraction,
          ranked.contextXml
        );

        const reportModel =
          extraction.complexity === "VERY_HIGH" ? thinkingModel : defaultModel;

        try {
          const result = streamText({
            model: reportModel,
            system: REPORT_SYSTEM_PROMPT,
            prompt: userPrompt,
          });

          let fullReport = "";
          for await (const chunk of result.textStream) {
            fullReport += chunk;
            send(encodeSSE({ type: "text", data: chunk }));
          }

          send(encodeProgress("report", "completed"));
          send(
            encodeSSE({ type: "report-meta", data: parseReport(fullReport) }),
          );
        } catch {
          const fallback = dummyReportMarkdown(idea);
          send(encodeSSE({ type: "text", data: fallback }));
          send(encodeProgress("report", "error", "리포트 생성 실패 — 기본 리포트를 표시합니다"));
          send(encodeSSE({ type: "report-meta", data: dummyReportMeta(idea) }));
        }

        // Send search context for chat
        send(encodeSSE({ type: "context", data: ranked.contextXml }));
        send(encodeDone());
      } catch (err) {
        send(
          encodeSSE({
            type: "error",
            data: err instanceof Error ? err.message : "Unknown error",
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
