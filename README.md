# VibCheck — 바이브 코더를 위한 아이디어 검증 앱

> "이거 내가 만들 수 있어?" 에 답하는 AI 아이디어 검증 서비스

비개발자 출신 바이브 코더가 아이디어를 입력하면, GitHub·웹 검색·AI 분석을 통해 **구현 가능성 중심의 검증 리포트**를 생성하고, 후속 채팅으로 아이디어를 발전시킬 수 있습니다.

## 주요 기능

- **아이디어 검증 리포트** — 자연어로 아이디어를 입력하면 구현 가능성 판정, 유사 프로젝트 분석, 시장 트렌드를 담은 구조화된 리포트를 SSE 스트리밍으로 실시간 생성
- **4단계 판정 등급** — 바이브코딩으로 가능 / 조건부 가능 / 개발자 도움 필요 / 현재 기술로 어려움
- **Build or Fork 판단** — 유사 오픈소스 프로젝트를 분석하여 직접 만들지, 기존 프로젝트를 활용할지 추천
- **후속 채팅** — 리포트 기반 Q&A로 아이디어를 심화 탐색
- **검증 히스토리** — 이전 검증 기록을 로컬스토리지에 저장하여 재열람
- **결과 다운로드** — JSON / Markdown 파일로 내보내기

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript, React 19 |
| 스타일링 | Tailwind CSS 4 |
| AI | Anthropic Claude API (`@ai-sdk/anthropic`, Vercel AI SDK) |
| 검색 | GitHub REST API, Tavily Search API |
| 배포 | Vercel |

## 분석 파이프라인

```
아이디어 입력
    │
    ▼
Phase 0: 사전 심사 + 키워드 추출 (Haiku)
    │
    ├─ IMPOSSIBLE → 단축 리포트 (검색 생략)
    │
    ▼
Phase 1-2: GitHub + Tavily 병렬 검색 (영어 + 한국어 쿼리)
    │
    ▼
Phase 3: 생태계 성숙도 기반 적응형 랭킹
    │
    ▼
Phase 4: AI 리포트 생성 (Sonnet / VERY_HIGH → Opus)
    │
    ▼
후속 채팅 (Sonnet, prompt caching)
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm

### 환경 변수

`.env.local` 파일을 생성하고 다음 키를 설정합니다:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
GITHUB_TOKEN=your_github_token          # optional, rate limit 완화
TAVILY_API_KEY=your_tavily_api_key
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

`http://localhost:3000`에서 앱을 확인할 수 있습니다.

### 빌드

```bash
npm run build
npm start
```

### 테스트

```bash
npm test            # 단회 실행
npm run test:watch  # 감시 모드
```

## 프로젝트 구조

```
app/
├── page.tsx              # 랜딩/입력 페이지
├── check/page.tsx        # 분석 결과 + 채팅 페이지
├── api/
│   ├── analyze/          # 분석 파이프라인 (SSE)
│   └── chat/             # 후속 채팅 API
components/               # UI 컴포넌트
hooks/                    # 커스텀 훅 (useAnalysis 등)
lib/
├── pipeline/             # 검색·랭킹·키워드 추출
├── prompts.ts            # LLM 프롬프트
├── report.ts             # 리포트 파싱
├── sse.ts                # SSE 공유 스키마
├── cache.ts              # 서버 인메모리 TTL 캐시
└── export.ts             # 결과 다운로드 유틸리티
```

## 문서

- [SPEC.md](./SPEC.md) — 기능 요구사항 명세서
- [ADR.md](./ADR.md) — 아키텍처 결정 기록

## 해커톤 정보

이 프로젝트는 [제 1회 OKKY 바이브코딩 해커톤](https://vibecoding.okky.kr/)에 참가한 프로젝트입니다.

## 라이선스

MIT
