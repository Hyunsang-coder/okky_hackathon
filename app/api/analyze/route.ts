import { streamText } from "ai";
import { defaultModel } from "@/lib/models";
import { extractKeywords } from "@/lib/pipeline/extract-keywords";
import { searchGitHub } from "@/lib/pipeline/search-github";
import { searchTavily } from "@/lib/pipeline/search-tavily";
import { rankResults } from "@/lib/pipeline/rank-results";
import {
  REPORT_SYSTEM_PROMPT,
  IMPOSSIBLE_REPORT_PROMPT,
  buildAnalysisUserPrompt,
} from "@/lib/prompts";

export const maxDuration = 120;

function sseEvent(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

function progressEvent(
  step: string,
  status: string,
  detail?: string
): string {
  return sseEvent("progress", { step, status, detail });
}

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
        send(progressEvent("keywords", "started", "아이디어 분석 중..."));
        const extraction = await extractKeywords(idea);
        send(
          progressEvent(
            "keywords",
            "completed",
            `"${extraction.classification}" 분류 완료`
          )
        );

        // IMPOSSIBLE case: skip search, generate short report
        if (extraction.classification === "IMPOSSIBLE") {
          // Skip search steps
          send(progressEvent("github", "completed", "검색 생략"));
          send(progressEvent("tavily", "completed", "검색 생략"));
          send(progressEvent("ranking", "completed", "검색 생략"));

          send(
            progressEvent(
              "report",
              "started",
              "단축 리포트 생성 중..."
            )
          );

          const result = streamText({
            model: defaultModel,
            system: IMPOSSIBLE_REPORT_PROMPT,
            prompt: `사용자 아이디어: ${idea}\n\n사전 심사 결과:\n- 분류: IMPOSSIBLE\n- 이유: ${extraction.reason}\n- 대안 제안: ${extraction.alternative || "없음"}`,
          });

          for await (const chunk of result.textStream) {
            send(sseEvent("text", chunk));
          }

          send(progressEvent("report", "completed"));
          send(sseEvent("context", ""));
          send(`data: [DONE]\n\n`);
          controller.close();
          return;
        }

        // SEARCHABLE / AMBIGUOUS: proceed with search
        // GitHub + Tavily in parallel
        send(
          progressEvent("github", "started", "유사 프로젝트 검색 중...")
        );
        send(
          progressEvent("tavily", "started", "시장 정보 수집 중...")
        );

        const [githubResult, tavilyResult] = await Promise.allSettled([
          searchGitHub(extraction.github_queries, extraction.topics),
          searchTavily(extraction.tavily_queries),
        ]);

        const github =
          githubResult.status === "fulfilled"
            ? githubResult.value
            : { repos: [], signal: "NOVEL" as const };
        const tavily =
          tavilyResult.status === "fulfilled" ? tavilyResult.value : [];

        send(
          progressEvent(
            "github",
            githubResult.status === "fulfilled" ? "completed" : "error",
            githubResult.status === "fulfilled"
              ? `${github.repos.length}개 프로젝트 발견 (${github.signal})`
              : "GitHub 검색 실패"
          )
        );
        send(
          progressEvent(
            "tavily",
            tavilyResult.status === "fulfilled" ? "completed" : "error",
            tavilyResult.status === "fulfilled"
              ? `${tavily.length}개 자료 발견`
              : "웹 검색 실패"
          )
        );

        // Ranking
        send(progressEvent("ranking", "started", "검색 결과 정리 중..."));
        const keywords = extraction.github_queries.flatMap((q) =>
          q.split(" ")
        );
        const ranked = rankResults(
          github.repos,
          tavily,
          github.signal,
          keywords
        );
        send(progressEvent("ranking", "completed"));

        // Report generation
        send(progressEvent("report", "started", "AI 리포트 생성 중..."));

        const userPrompt = buildAnalysisUserPrompt(
          idea,
          extraction,
          ranked.contextXml
        );

        const result = streamText({
          model: defaultModel,
          system: REPORT_SYSTEM_PROMPT,
          prompt: userPrompt,
        });

        for await (const chunk of result.textStream) {
          send(sseEvent("text", chunk));
        }

        send(progressEvent("report", "completed"));

        // Send search context for chat
        send(sseEvent("context", ranked.contextXml));
        send(`data: [DONE]\n\n`);
      } catch (err) {
        send(
          sseEvent(
            "error",
            err instanceof Error ? err.message : "Unknown error"
          )
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
