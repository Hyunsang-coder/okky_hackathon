// UI 확인용 Mock SSE 엔드포인트 — 실제 API 호출 없이 전체 플로우를 재현합니다.

const DEMO_REPORT = `## 판정: 바이브코딩으로 가능
**확신도:** 0.82

바이브코딩(AI 코딩 도구 활용)으로 충분히 구현 가능한 아이디어입니다. 지도 API와 위치 기반 서비스를 활용하면 핵심 기능을 빠르게 프로토타이핑할 수 있습니다.

## 필요 기술 스택
- **프론트엔드**: React Native 또는 Flutter (크로스플랫폼 모바일)
- **지도/위치**: Google Maps API 또는 카카오맵 API
- **백엔드**: Supabase 또는 Firebase (BaaS로 빠른 개발)
- **AI 추천**: OpenAI API (경로 최적화 및 장소 추천)
- **데이터**: 공공데이터포털 동물병원 API, 카카오 로컬 API

## 단계별 로드맵
1. **MVP (2주)** — 카카오맵 기반 산책 경로 표시 + 현재 위치 주변 동물병원 검색
2. **v1.0 (4주)** — 산책 기록 저장, 추천 경로 알고리즘, 동물 카페 정보 추가
3. **v1.5 (6주)** — 커뮤니티 기능 (산책 코스 공유), 반려동물 건강 기록 연동
4. **v2.0 (8주)** — AI 기반 맞춤 경로 추천, 날씨·미세먼지 기반 산책 적합도 알림

## 유사 프로젝트
| 이름 | 스타 | 기술스택 | 설명 |
|------|------|---------|------|
| [puppylove/walk-tracker](https://github.com) | 1,240 | React Native, Firebase | 반려견 산책 트래커 |
| [petmap/petmap-app](https://github.com) | 876 | Flutter, Google Maps | 반려동물 친화 장소 지도 |
| [doggo-routes/planner](https://github.com) | 523 | Next.js, Mapbox | 산책 경로 플래너 |

## 시장/트렌드
- 국내 반려동물 양육 가구 1,500만 시대 — 펫테크 시장 연 15% 성장 중
- 기존 앱들은 산책 기록에 집중, **경로 추천 + 주변 시설 통합**은 차별화 포인트
- 카카오맵·네이버지도 API의 국내 POI 데이터가 풍부해 한국 시장에 유리
- 공공데이터포털에서 동물병원·약국 위치 데이터를 무료 제공 중`;

import { encodeSSE, encodeProgress, encodeDone, type SSEEvent } from "@/lib/sse";
import { parseReport } from "@/lib/report";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (str: string) => controller.enqueue(encoder.encode(str));

      // Step 1–4: progress steps
      const progressSteps = [
        { step: "keywords" as const, detail: "키워드 5개 추출" },
        { step: "github" as const, detail: "저장소 12개 발견" },
        { step: "tavily" as const, detail: "결과 8개 수집" },
        { step: "ranking" as const, detail: "상위 5개 선별" },
      ];
      for (const s of progressSteps) {
        send(encodeProgress(s.step, "started", `${s.detail}...`));
        await delay(200);
        send(encodeProgress(s.step, "completed", s.detail));
      }

      // Step 5: report — stream text rapidly
      send(encodeProgress("report", "started", "리포트 생성 중..."));
      await delay(100);

      const chunks = DEMO_REPORT.match(/.{1,120}/gs) ?? [];
      for (const chunk of chunks) {
        send(encodeSSE({ type: "text", data: chunk }));
        await delay(15);
      }

      send(encodeSSE({ type: "report-meta", data: parseReport(DEMO_REPORT) }));
      send(encodeProgress("report", "completed", "리포트 완성"));
      send(encodeSSE({ type: "context", data: "<search_results><github_repos><repo name='puppylove/walk-tracker' stars='1240'>반려견 산책 트래커</repo></github_repos></search_results>" }));
      send(encodeDone());

      controller.close();
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
