# VibCheck - 아키텍처 결정 기록

## ADR-001: 기술 스택 선정

### 상태
승인됨

### 맥락
비개발자 바이브 코더를 위한 아이디어 검증 앱을 구축한다.
Vercel 기반으로 프론트·백엔드를 단일 프로젝트로 관리하며, 빠른 개발과 배포가 핵심이다.

### 결정
- **프레임워크**: Next.js (App Router)
- **배포**: Vercel
- **스타일링**: Tailwind CSS
- **외부 API**:
  - GitHub REST API — 유사 프로젝트 검색
  - Tavily Search API — 웹 검색/시장 분석
  - Anthropic Claude API — AI 분석 및 채팅

### 근거
- Next.js App Router: Vercel 최적 호환, API Routes로 백엔드 통합, 스트리밍 네이티브 지원
- Tailwind CSS: 빠른 UI 개발
- Vercel AI SDK: Anthropic 스트리밍 응답 처리에 최적화된 도구 제공

---

## ADR-002: UX — 리포트 + 채팅 하이브리드

### 상태
승인됨

### 맥락
비개발자가 아이디어를 검증하는 경험 형태를 결정해야 한다.

### 결정
2단계 하이브리드:
1. **리포트 단계**: 아이디어 입력 → 구조화된 검증 리포트 자동 생성
2. **채팅 단계**: 리포트 기반 Q&A, 아이디어 수정/발전

### 근거
- 리포트로 첫 판단에 필요한 정보를 구조적으로 전달 (특히 구현 가능성 판정)
- 채팅으로 궁금한 점 심화 탐색 및 아이디어 피벗 가능
- 비개발자에게 "일단 답을 주고 → 대화로 풀어가는" 경험이 가장 자연스러움

---

## ADR-003: API 호출 파이프라인

### 상태
승인됨

### 맥락
3개의 외부 API(GitHub, Tavily, Anthropic)를 효율적으로 조합해야 한다.

### 결정

```
[사용자 아이디어 입력]
        │
        ▼
[LLM 키워드 추출] ← 자연어를 효과적 검색 쿼리로 변환
        │
   ┌────┴────┐
   ▼         ▼
[GitHub]  [Tavily]  ← 병렬 호출
   │         │
   └────┬────┘
        ▼
[LLM 리포트 생성] ← 수집 데이터 + 구조화 프롬프트 → 스트리밍 출력
        │
        ▼
   [채팅 모드] ← 리포트 컨텍스트 유지
```

### 근거
- 병렬 호출로 응답 시간 최소화
- LLM 키워드 추출으로 비개발자의 모호한 표현도 정확한 검색으로 전환
- 스트리밍으로 체감 대기 시간 단축

---

## ADR-004: 리포트 구조 — 구현 가능성 최우선

### 상태
승인됨

### 맥락
리포트 섹션의 우선순위와 구조를 결정해야 한다.

### 결정
리포트 섹션 순서:
1. **구현 가능성 판정** (핵심) — 판정 등급 + 이유 + 로드맵 + 난이도 레벨링
2. **유사 프로젝트 & Build/Fork/Contribute** — 만들 것인지 기존 것을 활용할 것인지
3. **시장/트렌드 요약** (간략)

### 근거
- 비개발자 바이브 코더의 1순위 관심: "이걸 내가 만들 수 있나?"
- Build/Fork/Contribute 판단은 불필요한 노력을 줄여주는 핵심 인사이트
- 시장 분석은 부수적 — 바이브 코더는 빠르게 만들고 시장에서 검증하는 사람들
- 난이도 레벨링(바이브코딩 가능 / 조건부 / 개발자 필요 / 불가)은 비개발자에게 즉각적으로 유용한 판단 기준

---

## ADR-005: 분석 API와 채팅 API 분리

### 상태
승인됨

### 맥락
초기에는 `/api/chat` 하나로 리포트 생성과 후속 채팅을 모두 처리했으나, 검색 파이프라인(GitHub + Tavily)이 추가되면서 두 가지 역할의 요구사항이 달라졌다.

### 결정
- `POST /api/analyze` — SSE 스트림. 파이프라인 오케스트레이션 (키워드 추출 → 검색 → 랭킹 → 리포트 스트리밍). 커스텀 EventSource로 소비.
- `POST /api/chat` — Vercel AI SDK `useChat` 호환. Report를 body에 포함하여 시스템 프롬프트에 주입.

### 근거
- 분석은 멀티스텝 파이프라인(progress 이벤트 + 텍스트 스트림 + 컨텍스트 전달)이 필요하여 표준 `useChat` 프로토콜로는 부족
- 채팅은 표준 AI SDK 프로토콜이 적합 (메시지 배열 + 스트리밍 응답)
- 관심사 분리로 각각 독립적으로 테스트/수정 가능

---

## ADR-006: Phase 0 사전 심사 통합

### 상태
승인됨

### 맥락
터무니없는 아이디어("시간 여행 앱")에 대해 불필요한 검색 API 호출과 비용이 발생하는 문제.

### 결정
키워드 추출 Haiku 호출에 사전 심사를 통합. IMPOSSIBLE 판정 시 검색을 생략하고 단축 리포트를 생성.

### 근거
- 별도 API 호출 없이 기존 Haiku 호출에 분류/복잡도/데이터의존성 평가를 추가 (비용 추가 미미)
- IMPOSSIBLE 케이스에서 GitHub/Tavily 호출 완전 생략 → 건당 ~$0.04 절감
- 복잡도 × 데이터 가용성 매트릭스로 체계적 판정 가이드라인 제공

---

## ADR-007: 생태계 성숙도 신호 기반 적응형 랭킹

### 상태
승인됨

### 맥락
`stars:>5` 고정 필터는 니치 분야에서 유효한 결과를 놓치는 문제.

### 결정
2단 검색 전략 + 신호(ESTABLISHED/EMERGING/NOVEL) 분류 + 신호별 적응형 랭킹 가중치.

### 근거
- 1단(stars:>10) → 부족 시 2단(stars:>=1)으로 니치 분야 커버리지 확보
- EMERGING 신호에서는 스타 대신 최신성·커밋 빈도에 가중치를 두어 활발한 초기 프로젝트 발견
- 신호를 리포트 프롬프트에 주입하여 맥락에 맞는 판정 유도

---

## ADR-008: 모델 용도별 분리 (Opus 제외)

### 상태
수정됨 (ADR-009에 의해 프로바이더 변경)

### 맥락
초기 설계에서 리포트 생성에 Opus를 사용했으나, 비용 대비 효과를 재평가함.

### 결정
- 키워드 추출 + 사전심사: Haiku 4.5 (`claude-haiku-4-5-20251001`, ~$0.001)
- 리포트 생성: Sonnet 4.5 (`claude-sonnet-4-5-20250929`, ~$0.05)
- 후속 채팅: Sonnet 4.5 (`claude-sonnet-4-5-20250929`, ~$0.02~0.04)
- Opus는 thinkingModel로 정의만 하고 현재 미사용

### 근거
- Sonnet이 구조화된 프롬프트 + 검색 결과 기반 분석에 충분한 품질 제공
- 1회 분석 비용 ~$0.08로 유지 (Opus 사용 시 ~$0.30+)

---

## ADR-009: LLM 프로바이더를 OpenRouter에서 Anthropic 직접 호출로 전환

### 상태
승인됨

### 맥락
OpenRouter를 통해 Anthropic 모델을 호출하고 있었으나, 모델 ID 형식 불일치(`anthropic/claude-haiku-4.5` vs `claude-haiku-4-5-20251001`)로 API 호출이 실패하는 문제가 발생. 또한 OpenRouter 중간 계층의 불필요한 지연과 장애 가능성이 존재했다.

### 결정
`@openrouter/ai-sdk-provider` → `@ai-sdk/anthropic`으로 교체. 환경 변수를 `OPENROUTER_API_KEY` → `ANTHROPIC_API_KEY`로 변경.

### 근거
- Anthropic 모델만 사용하므로 직접 호출이 더 단순하고 안정적
- 중간 프록시 제거로 latency 감소 및 장애 포인트 축소
- `@ai-sdk/anthropic`이 Vercel AI SDK와 네이티브 호환 — 모델 ID를 공식 Anthropic API 형식 그대로 사용 가능
- 비용 차이 없음 (OpenRouter의 Anthropic 모델도 원가 동일)

---

## ADR-010: AI SDK v6 UIMessage↔CoreMessage 변환 필수

### 상태
승인됨

### 맥락
채팅 API(`/api/chat`)에서 `DefaultChatTransport`가 보낸 메시지를 `streamText`에 그대로 전달하면 AI가 응답하지 않는 문제 발생. AI SDK v6에서 `useChat` + `DefaultChatTransport` 조합은 `UIMessage` 형식(`parts[]` 배열)을 보내지만, `streamText`는 `CoreMessage` 형식(`content` 문자열)을 기대한다.

### 결정
서버 라우트에서 `convertToModelMessages(messages)`를 호출하여 UIMessage → CoreMessage 변환 후 `streamText`에 전달.

```typescript
const modelMessages = await convertToModelMessages(messages);
const result = streamText({ model, system, messages: modelMessages });
```

### 근거
- AI SDK v6의 구조적 분리: UI 계층(UIMessage)과 모델 계층(CoreMessage)이 명시적으로 분리됨
- `DirectChatTransport`는 내부적으로 이 변환을 자동 수행하지만, `DefaultChatTransport` + 서버 라우트 조합에서는 개발자가 직접 변환해야 함
- `convertToModelMessages`는 AI SDK가 공식 제공하는 유틸리티로, 안정적이고 향후 호환성 보장

---

## ADR-011: SSE 이벤트 스키마를 공유 타입으로 분리

### 상태
승인됨

### 맥락
서버(API route)와 클라이언트(hooks)가 SSE 이벤트를 각각 문자열 기반으로 인코딩/파싱하고 있었다. 서버는 인라인 `sseEvent(type, data)` 함수로 JSON을 생성하고, 클라이언트는 `JSON.parse` 후 `event.type`을 문자열로 비교했다. 이벤트 포맷이 한쪽에서 변경되면 다른 쪽이 암묵적으로 깨지는 커플링 문제가 있었다.

### 결정
`lib/sse.ts`에 SSE 이벤트의 공유 스키마를 정의한다.

- **타입**: `SSEEvent` discriminated union으로 모든 이벤트 타입(`progress`, `text`, `context`, `report-meta`, `error`)을 정의
- **서버용 헬퍼**: `encodeSSE()`, `encodeProgress()`, `encodeDone()` — 타입 안전한 JSON 인코딩
- **클라이언트용 헬퍼**: `parseSSELine()` — `SSEMessage` 타입을 반환하는 파서
- **공유 하위 타입**: `ProgressStepId`, `ProgressStatus`, `SSEProgressData`로 progress 이벤트 구조화
- `AnalysisProgress`의 `ProgressStep.id`를 `ProgressStepId`로 타입 연결

### 근거
- 서버와 클라이언트가 동일한 타입을 참조하므로, 이벤트 포맷 변경 시 TypeScript 컴파일 에러로 즉시 감지
- 인코딩/파싱 로직이 한 파일에 집중되어 프로토콜 변경의 영향 범위가 명확
- UI와 백엔드의 병렬 작업 시 SSE 프로토콜 동기화 누락 방지

---

## ADR-012: 리포트 구조 파싱을 regex 대신 구조화된 데이터로 전환

### 상태
승인됨

### 맥락
LLM이 생성하는 마크다운 리포트에서 판정(verdict), 확신도(confidence), 섹션 구분을 추출하는 로직이 3곳에 분산되어 있었다.

| 위치 | 역할 | 방식 |
|------|------|------|
| `ReportView.splitSections()` | `## ` 기준 섹션 분리 + `heading.includes("판정:")` | 문자열 매칭 |
| `VerdictBadge.getVerdictFromReport()` | `## 판정:\s*(.+)` regex로 판정 추출 | regex |
| `history.extractVerdict()` | 동일 regex 중복 | regex |

프롬프트의 리포트 형식이 변경되면 3곳을 동시에 수정해야 하며, 누락 시 런타임에서 조용히 실패했다.

### 결정
`lib/report.ts`에 리포트 구조의 공유 스키마와 단일 파서를 정의하고, 서버에서 구조화된 데이터를 SSE로 전송한다.

**공유 타입:**
```typescript
type Verdict = "바이브코딩으로 가능" | "조건부 가능" | "개발자 도움 필요" | "현재 기술로 어려움";

interface ReportSection { heading: string; content: string; isVerdict: boolean; }
interface ReportMeta { verdict: Verdict | null; confidence: number | null; sections: ReportSection[]; }
```

**단일 파서:** `parseReport(markdown): ReportMeta` — 서버와 클라이언트 양쪽에서 사용 가능

**SSE 프로토콜 확장:** 스트리밍 완료 후 `report-meta` 이벤트로 구조화된 `ReportMeta`를 전송

**클라이언트 렌더링:**
- 스트리밍 중: `parseReport(partialText)`로 점진적 섹션 렌더링
- 스트리밍 완료: 서버 제공 `ReportMeta`를 권위적 데이터로 사용

**제거된 것:**
- `ReportView.splitSections()` → `parseReport()` 대체
- `VerdictBadge.getVerdictFromReport()` → `meta.verdict` 프로퍼티
- `history.extractVerdict()` → `reportMeta.verdict` 사용
- `heading.includes("판정:")` 문자열 매칭 → `section.isVerdict` boolean

### 근거
- 파싱 로직이 단일 함수에 집중되어 프롬프트 형식 변경 시 수정 지점이 1곳
- `Verdict` union 타입으로 판정 값이 컴파일 타임에 검증됨 (기존: 임의 문자열)
- `VerdictBadge`의 `VERDICT_COLORS`가 `Record<Verdict, ...>`로 타입 안전해짐 — 판정 등급 추가/변경 시 컴파일 에러
- 히스토리의 기존 문자열 데이터와 호환을 위해 `isVerdict()` 타입 가드 제공
- 서버에서 구조화 데이터를 전송하므로, 클라이언트 UI 코드에 리포트 포맷 지식이 불필요

---

## ADR-013: Phase 0 플랫폼/법적 리스크 축 추가

### 상태
승인됨

### 맥락
Phase 0 사전 심사(ADR-006)에서 복잡도와 데이터 의존성만 평가하고 있었다. 이로 인해 플랫폼 API 정책 제한(예: Instagram 자동 포스팅 — Meta 앱 심사 필수)이나 법적 리스크(예: 타인 얼굴 합성 — 초상권 침해)가 있는 아이디어도 "바이브코딩으로 가능"으로 오판될 수 있는 구조적 결함이 존재했다.

### 결정
Phase 0 키워드 추출에 두 개의 리스크 축을 추가한다:

**플랫폼 종속 리스크** (`PlatformRisk`):
- `NONE` — 특정 플랫폼에 종속되지 않음
- `OPEN` — 공개 API, 개인 개발자 자유 사용 가능
- `REVIEW_REQUIRED` — API 심사/승인 필요
- `ENTERPRISE_ONLY` — 기업 계약 필요, 개인 접근 불가
- `DEPRECATED` — API 폐기됨/폐기 예정

**법적/규제 리스크** (`LegalRisk[]`):
- `NONE` / `CAUTION` / `HIGH_RISK`
- 카테고리: 개인정보, 저작권, 초상권, 약관위반, 기타

**판정 오버라이드 규칙:**
- 복잡도 × 데이터 매트릭스로 기본 판정 → 리스크에 의한 하향 조정
- ENTERPRISE_ONLY/DEPRECATED → 최소 "현재 기술로 어려움"
- HIGH_RISK → 최소 "조건부 가능" + 법적 경고 섹션 최상단 배치

**구현:**
- `types.ts`: 타입/인터페이스 추가, `KeywordExtraction` 확장
- `extract-keywords.ts`: Zod 스키마 + 프롬프트에 4-5단계 추가
- `prompts.ts`: 시스템 프롬프트에 오버라이드 규칙, 유저 프롬프트에 XML 주입

### 근거
- "만들 수 있는가" 이전에 "만들어도 되는가", "접근 가능한가"를 먼저 답해야 비개발자에게 정확한 판정 제공
- 기존 Haiku 호출에 추가 지시만 포함하므로 비용 추가 미미
- XML 주입 패턴이 기존 complexity_warning, data_dependency_warning과 동일하여 일관성 유지
- `app/api/analyze/route.ts` 수정 불필요 — extraction 객체를 그대로 전달하므로 새 필드 자동 전파

