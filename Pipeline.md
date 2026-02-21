# VibCheck - 검색/판정 파이프라인 최적화 전략

## 개요

이 문서는 VibCheck의 핵심 파이프라인(아이디어 입력 → 검색 → 리포트 생성 → 채팅)을 최적화하기 위한 연구 결과와 구현 전략을 정리한다.

---

## 1. 전체 파이프라인 아키텍처

```
[사용자 아이디어 입력]
        │
        ▼
[Phase 0+1: Haiku — 사전 심사 + 키워드 추출]
        │
        ├── IMPOSSIBLE → [Sonnet: 단축 리포트] → 채팅 모드
        │                  (검색 생략, 대안 제안)
        │
        ├── AMBIGUOUS → 검색 수행 + 주의 태그 추가
        │
        └── SEARCHABLE → 정상 파이프라인
                │
                ├── 도메인/기술/유의어 키워드
                └── GitHub 토픽 후보
                │
           ┌────┴────┐
           ▼         ▼
        [GitHub]  [Tavily]  ← 병렬, 각각 멀티쿼리
           │         │
           │    ┌────┘
           ▼    ▼
        [결과 병합 · 중복 제거]
                │
                ▼
        [신호 분류: ESTABLISHED / EMERGING / NOVEL]
                │
                ├── ESTABLISHED → 기본 랭킹 + README 보강
                ├── EMERGING → 적응형 랭킹 + 활성도 보강
                └── NOVEL → Tavily 중심 분석
                │
                ▼
        [Phase 2: Sonnet — 리포트 생성] ← 스트리밍 + 신호 맥락 주입
                │
                ▼
        [프로그레시브 렌더링] ← 섹션별 점진 표시
                │
                ▼
        [채팅 모드] ← 리포트 컨텍스트 유지 + Prompt Caching
```

---

## 2. Phase 0: 아이디어 사전 심사 (Haiku)

### 목적

키워드 추출 전에 아이디어의 **기본 타당성을 사전 판별**하여 불필요한 API 호출을 방지한다.

### 왜 필요한가

터무니없는 아이디어("시간 여행 앱", "텔레파시 채팅", "중력 제어 앱")가 입력되면:
- 검색 API에서 SF 게임, 철학 기사 등 무관한 결과가 반환됨
- LLM이 해당 결과를 기반으로 그럴듯한 리포트를 생성해 **거짓 희망** 제공
- GitHub 4~5회 + Tavily 4크레딧 + Sonnet 호출 = **비용 낭비**

### 구현: Phase 1과 통합

키워드 추출 Haiku 호출에 사전 심사를 **통합**한다 (별도 호출 X, 비용 추가 없음).
타당성 분류에 더해 **구현 복잡도**, **데이터 의존성**, **플랫폼 리스크**, **법적 리스크**를 함께 평가한다.

```
사용자의 아이디어를 분석하라.

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
- "RESTRICTED" — API가 존재하지만 접근이 제한됨 (승인 필요, 기업 전용, 비용 과다, 약관 제한)
- "BUILDABLE" — API는 없지만 직접 데이터 수집/구축 가능
- "UNAVAILABLE" — 해당 데이터 자체가 존재하지 않거나 접근 불가

4단계: 플랫폼 종속 리스크 평가 (SEARCHABLE/AMBIGUOUS만)
아이디어가 특정 플랫폼(Instagram, KakaoTalk, Twitter/X 등)에 의존하는 경우:
- 해당 플랫폼의 API 정책을 평가하라
- "OPEN" — 개인 개발자도 자유롭게 사용 가능
- "REVIEW_REQUIRED" — 앱 심사/승인 필요 (거부 가능성 있음)
- "ENTERPRISE_ONLY" — 기업/파트너만 접근 가능
- "DEPRECATED" — 폐지 예정이거나 이미 폐지됨
- "NONE" — 특정 플랫폼에 종속되지 않음

5단계: 법적/규제 리스크 평가 (SEARCHABLE/AMBIGUOUS만)
아이디어에 다음과 같은 법적 리스크가 있는지 평가하라:
- "NONE" — 알려진 법적 리스크 없음
- "CAUTION" — 구현 방식에 따라 법적 이슈 가능 (면책 조항, 이용약관으로 대응 가능)
- "HIGH_RISK" — 개인정보보호법, 저작권법, 초상권 등 명확한 법적 리스크 존재
각 리스크에 대해 구체적 법률/규제와 위반 내용을 명시하라.

6단계: 분류 결과에 따라
- SEARCHABLE/AMBIGUOUS → 검색 키워드를 추출
- IMPOSSIBLE → 불가능 이유와 대안 아이디어를 제시

출력 형식 (JSON):
{
  "classification": "SEARCHABLE" | "IMPOSSIBLE" | "AMBIGUOUS",
  "complexity": "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
  "data_dependencies": [
    {
      "name": "필요한 데이터/API 이름",
      "status": "AVAILABLE_FREE" | "AVAILABLE_PAID" | "RESTRICTED" | "BUILDABLE" | "UNAVAILABLE",
      "detail": "구체적 API 이름 또는 제한/불가능 이유"
    }
  ],
  "platform_risk": {
    "status": "NONE" | "OPEN" | "REVIEW_REQUIRED" | "ENTERPRISE_ONLY" | "DEPRECATED",
    "platform": "종속 플랫폼 이름 (해당 시)",
    "detail": "구체적 제한 내용"
  },
  "legal_risks": [
    {
      "severity": "NONE" | "CAUTION" | "HIGH_RISK",
      "category": "개인정보 | 저작권 | 초상권 | 약관위반 | 기타",
      "detail": "구체적 법률/규제와 위반 내용"
    }
  ],
  "reason": "분류 이유 (1~2문장)",
  "alternative": "리스크 존재 시 안전한 대안 (선택)",
  "github_queries": [...],
  "tavily_queries": {...},
  "topics": [...]
}
```

### 분류 기준

| 분류 | 기준 | 예시 |
|------|------|------|
| IMPOSSIBLE | 물리법칙 위반 | "시간 여행 앱", "순간이동 서비스" |
| IMPOSSIBLE | 현존 기술 근본 한계 | "뇌파로 생각을 텍스트로 완벽 변환", "100% 정확한 미래 예측" |
| AMBIGUOUS | 부분적으로 가능할 수 있음 | "AI로 꿈을 영상화" → 생성AI로 유사하게는 가능 |
| SEARCHABLE | 기존 기술 조합으로 가능성 있음 | "인스타 사진 해시태그 추천", "일정 자동 관리 봇" |

### 복잡도 × 데이터 가용성 판정 매트릭스

Phase 0에서 `complexity`와 `data_dependencies`가 결정되면,
리포트 프롬프트에 **판정 가이드라인**으로 주입된다.

```
          데이터 가용성
           FREE    PAID    BUILDABLE   UNAVAILABLE
         ┌────────┬────────┬──────────┬────────────┐
  LOW    │ 바이브  │ 조건부  │  조건부   │  어려움*   │
         │ 코딩OK │ 가능   │  가능    │            │
  MEDIUM ├────────┼────────┼──────────┼────────────┤
         │ 바이브  │ 조건부  │  개발자   │  어려움*   │
         │ 코딩OK │ 가능   │  도움    │            │
  HIGH   ├────────┼────────┼──────────┼────────────┤
         │ 조건부  │ 개발자  │  개발자   │  어려움    │
         │ 가능   │ 도움   │  도움    │            │
  V_HIGH ├────────┼────────┼──────────┼────────────┤
         │ 개발자  │ 개발자  │  어려움   │  어려움    │
         │ 도움   │ 도움   │         │            │
         └────────┴────────┴──────────┴────────────┘

* UNAVAILABLE이면 복잡도와 무관하게 "어려움" 또는 "불가"에 가까움
  단, 대안 데이터소스가 있으면 한 단계 완화 가능
```

이 매트릭스는 **기본 가이드라인**이며, 검색 결과에 따라 Sonnet이 최종 조정한다.

### 플랫폼 리스크 오버라이드

매트릭스 결과와 별개로, 플랫폼/법적 리스크가 있으면 **판정을 하향 조정하거나 경고를 추가**한다.

```
판정 결과 = max(매트릭스 판정, 리스크 조정)

플랫폼 리스크 조정:
  REVIEW_REQUIRED → 최소 "조건부 가능" + 승인 실패 가능성 경고
  ENTERPRISE_ONLY → 최소 "현재 기술로 어려움" (개인 개발자 접근 불가)
  DEPRECATED      → 최소 "현재 기술로 어려움" + 대안 API 제시

법적 리스크 조정:
  CAUTION   → 판정 유지하되 리포트에 법적 주의사항 섹션 필수 추가
  HIGH_RISK → 최소 "조건부 가능" + 법적 위험 경고 섹션 최상단 배치
```

**예시: 복잡도 LOW + 데이터 FREE이지만 플랫폼이 ENTERPRISE_ONLY인 경우**
- 매트릭스 판정: "바이브코딩으로 가능"
- 플랫폼 오버라이드: "현재 기술로 어려움"
- **최종 판정: "현재 기술로 어려움"** (API 접근 자체가 막혀있으므로)

### 리포트에 주입되는 리스크 맥락

**플랫폼 API 제한 감지 시:**

```xml
<platform_risk status="ENTERPRISE_ONLY" platform="Instagram Graph API">
이 아이디어는 Instagram의 API에 의존합니다.
현재 Instagram Graph API는 비즈니스/크리에이터 계정 + 앱 심사를 통과해야 사용 가능하며,
개인 개발자나 소규모 프로젝트에는 승인이 매우 어렵습니다.

반드시 다음을 포함하라:
1. 해당 플랫폼 API의 현재 접근 정책을 정확히 기술
2. 개인 개발자가 접근 가능한지 여부
3. 플랫폼에 종속되지 않는 대안 접근법 (예: 사용자가 직접 업로드)
4. 유사하지만 API 정책이 열린 대체 플랫폼 (예: Unsplash, Pixabay)
</platform_risk>
```

**법적 리스크 감지 시:**

```xml
<legal_risk severity="HIGH_RISK">
이 아이디어에 다음 법적 리스크가 존재합니다:
- 개인정보보호법 위반 가능: 타인의 위치 정보 수집/공유는 정보주체 동의 필수
- 초상권 침해 가능: 타인의 얼굴을 동의 없이 가공/합성하는 행위

반드시 리포트 최상단(판정 바로 아래)에 법적 경고 섹션을 배치하라.
"만들 수 있는가"보다 "만들어도 되는가"를 먼저 답하라.
다음을 포함하라:
1. 구체적으로 어떤 법률이 적용되는지
2. 위반 시 예상되는 결과 (벌금, 서비스 중단, 소송 등)
3. 합법적으로 같은 가치를 제공할 수 있는 우회 방법
4. 면책 조항이나 이용약관으로 해결 가능한 범위
</legal_risk>
```

### IMPOSSIBLE 판정 시 파이프라인 단축

```
[사용자 아이디어]
      │
      ▼
[Haiku: 사전 심사 + 키워드 추출]
      │
      ├── SEARCHABLE/AMBIGUOUS → 기존 파이프라인 (검색 → 리포트)
      │
      └── IMPOSSIBLE → 검색 생략, 즉시 리포트 생성
            │
            ▼
         [Sonnet: 단축 리포트]
            - 판정: "현재 기술로 어려움"
            - 불가능 이유 (비개발자 언어로)
            - 유사하지만 가능한 대안 아이디어 제안
            - "이런 방향은 어떨까요?" 형태의 피벗 제안
```

**비용 절감 효과**: IMPOSSIBLE 케이스에서 GitHub/Tavily 호출 완전 생략 → ~$0.04 절약/건

### AMBIGUOUS 판정 시 특수 처리

모호한 아이디어는 검색은 수행하되 리포트 프롬프트에 주의 태그를 추가:

```xml
<caution>
이 아이디어는 해석에 따라 구현 범위가 크게 달라질 수 있습니다.
검색 결과를 보수적으로 해석하고, 리포트에서 "해석 A로는 가능, 해석 B로는 어려움"
형태로 조건을 명시하세요.
</caution>
```

---

## 3. Phase 1: LLM 키워드 추출 (Haiku)

### 목적

비개발자의 자연어 아이디어를 효과적인 검색 쿼리로 변환한다.

### 모델 선택

- **Claude Haiku** 사용 (빠르고 저렴, ~$0.001/호출)
- 키워드 추출은 복잡한 추론이 불필요하므로 가장 작은 모델이 적합

### 프롬프트 설계

```
사용자의 아이디어에서 검색에 효과적인 키워드를 추출하라.

출력 형식 (JSON):
{
  "github_queries": ["검색어1", "검색어2", "검색어3"],
  "tavily_queries": {
    "competitors": "경쟁 제품 검색 쿼리",
    "trends": "시장 트렌드 검색 쿼리",
    "technical": "기술 구현 방법 검색 쿼리"
  },
  "topics": ["github-topic-1", "github-topic-2"]
}
```

### 추출 전략

| 카테고리 | 설명 | 예시 |
|---------|------|------|
| 도메인 키워드 | 핵심 기능/분야 | `mood tracking`, `hashtag recommendation` |
| 기술 키워드 | 구현 기술/방법 | `face detection`, `NLP`, `image classification` |
| 유의어 | 같은 개념의 다른 표현 | `emotion analysis` ↔ `sentiment detection` |
| 토픽 후보 | GitHub topic 태그 | `emotion-detection`, `face-api` |

---

## 3. GitHub 검색 최적화

### 3.1 엔드포인트 선택

| 엔드포인트 | 용도 | 권장도 |
|-----------|------|--------|
| `GET /search/repositories` | 유사 레포 검색 (주력) | **기본 사용** |
| `GET /search/topics` | 관련 토픽 탐색 (보조) | 쿼리 확장용 |
| `GET /search/code` | 코드 내 검색 (비추) | 사용 안 함 |

### 3.2 멀티쿼리 전략

한 개의 넓은 쿼리 대신 **3~5개 관점별 쿼리를 병렬 실행**한다.

```
쿼리 A: "mood detection face" in:description,readme          (도메인 중심)
쿼리 B: "emotion recognition webcam" in:description,readme   (기술 중심)
쿼리 C: topic:emotion-detection topic:face-recognition        (토픽 중심)
쿼리 D: "facial emotion analysis" OR "mood tracker face"     (유의어)
```

### 3.3 품질 필터링 — 2단 검색 전략

기존 `stars:>5` 고정 필터는 니치 분야에서 유효한 결과를 놓친다.
**2단 검색으로 해결**한다.

**1단: 기본 검색 (품질 우선)**
```
stars:>10 pushed:>2025-06-01 -is:fork archived:false
```

**2단: 완화 검색 (1단 결과가 3개 미만일 때 자동 실행)**
```
stars:>=1 pushed:>2024-01-01 -is:fork archived:false
```

```typescript
async function searchGitHub(queries: string[]) {
  // 1단: 엄격한 필터
  const strictResults = await searchWithFilters(queries, { minStars: 10 });

  if (strictResults.length >= 3) {
    return { results: strictResults, signal: "ESTABLISHED" };
  }

  // 2단: 완화 필터로 재검색
  const broadResults = await searchWithFilters(queries, { minStars: 1 });

  if (broadResults.length === 0) {
    return { results: [], signal: "NOVEL" };
  }

  return { results: broadResults, signal: "EMERGING" };
}
```

### 3.4 생태계 성숙도 신호

GitHub 결과의 양과 질을 기반으로 **신호를 분류**한다.
이 신호는 리포트 프롬프트에 전달되어 판정과 Build/Fork/Contribute에 직접 영향을 준다.

| 신호 | 조건 | 의미 | 리포트 영향 |
|------|------|------|-----------|
| **ESTABLISHED** | 10+ 스타 레포 3개 이상 | 성숙한 생태계 | Fork/Contribute 우선 검토 |
| **EMERGING** | 1~10 스타 레포만 존재 | 초기 시장, 선점 기회 | Build 추천 가능성 ↑ |
| **NOVEL** | 관련 레포 0건 | 미개척 영역 or 비현실적 | 가능 여부 신중 판단 |

#### EMERGING 신호 — 리포트에 추가할 맥락

```xml
<ecosystem_signal type="EMERGING">
이 아이디어와 관련된 GitHub 프로젝트는 소수의 초기 단계 프로젝트만 존재합니다.
이는 다음을 의미할 수 있습니다:
1. 아직 충분히 탐색되지 않은 기회 영역 (선점 가능)
2. 기술적으로 어려워 시도가 적은 영역
3. 최근 등장한 새로운 분야

검색 결과의 프로젝트들이 활발히 개발 중인지, 방치된 상태인지를 반드시 구분하십시오.
Fork가 아닌 Build를 우선 고려하되, 활발한 소규모 프로젝트가 있다면
Contribute를 추천할 수 있습니다.
</ecosystem_signal>
```

#### NOVEL 신호 — 리포트에 추가할 맥락

```xml
<ecosystem_signal type="NOVEL">
이 아이디어와 관련된 GitHub 프로젝트가 발견되지 않았습니다.
이는 두 가지 가능성이 있습니다:
1. 완전히 새로운 아이디어 → 선점 기회이나 참고할 코드가 없어 난이도 상승
2. 현실적으로 구현이 어려운 아이디어 → Tavily 검색 결과와 기술 분석을 기반으로 판단

Build/Fork/Contribute 중 Build만 해당되며,
"처음부터 만들어야 하는 부담"을 로드맵에 명확히 반영하십시오.
</ecosystem_signal>
```

### 3.5 결과 랭킹 — 신호별 적응형 가중치

**신호에 따라 가중치를 동적으로 조정**한다.

| 팩터 | ESTABLISHED | EMERGING | 산출 방법 |
|------|------------|----------|----------|
| 스타 수 | **25%** | **10%** | `log10(stars + 1) / 5` |
| 최신성 | 20% | **30%** | 마지막 push 일자 기반 감쇠 |
| 설명 일치도 | 20% | 20% | 사용자 키워드와 description 겹침 |
| README 품질 | 15% | 10% | README 길이 > 500자 여부 |
| 토픽 존재 | 10% | 10% | 관련 토픽 태그 보유 여부 |
| 라이선스 | 10% | 5% | 오픈소스 라이선스 존재 여부 |
| 커밋 빈도 | — | **15%** | 최근 3개월 커밋 수 |

**EMERGING에서 스타 가중치를 낮추는 이유:**
스타 1~10개 사이에서는 스타 수가 품질과 거의 무관하다.
대신 **최신성**과 **커밋 빈도**가 "활발한 초기 프로젝트"를 찾는 데 훨씬 유효하다.

**멀티쿼리 부스트** (모든 신호 공통):
- 2개 쿼리 등장: +25%
- 3개 쿼리 등장: +50%
- 4개 이상: +75%

### 3.6 상세 데이터 보강 — 신호별 차별화

**ESTABLISHED (기본):**
상위 5~10개 레포의 README를 조회:

```
GET /repos/{owner}/{repo}/readme
Accept: application/vnd.github.raw+json
```

README에서 추출할 정보:
- 첫 문단 (프로젝트 요약)
- 기능 목록 (bullet points)
- 기술 스택 언급
- 데모/스크린샷 링크 (프로젝트 성숙도 지표)

**EMERGING (추가 조회):**
README에 더해 **활성도 지표**를 추가 조회:

```
GET /repos/{owner}/{repo}                      → created_at, open_issues_count
GET /repos/{owner}/{repo}/commits?per_page=1   → 최근 커밋 일자
GET /repos/{owner}/{repo}/languages            → 실제 사용 언어 비율
```

활성도 판단 기준:

| 지표 | 긍정 신호 | 부정 신호 |
|------|----------|----------|
| 생성일 | 최근 6개월 이내 | 2년 이상 전 |
| 최근 커밋 | 1개월 이내 | 6개월 이상 전 |
| 이슈 수 | 열린 이슈 있음 (관심 존재) | 이슈 0건 (관심 없음) |
| 언어 비율 | 주 언어 60%+ (실제 프로젝트) | 주 언어 20% 미만 (PoC/스켈레톤) |

이로써 스타는 낮지만 **실제로 활발한 프로젝트**를 구별할 수 있다.

### 3.7 Rate Limit 관리

| 조건 | 제한 |
|------|------|
| 인증된 검색 | 30회/분 |
| 비인증 검색 | 10회/분 |
| 일반 API (인증) | 5,000회/시 |

**예상 소비량** (1회 분석 기준):
- 검색 쿼리 5개 × 1페이지 = 5회 (검색 제한 30회 중)
- README 조회 10개 = 10회 (일반 제한 5,000회 중)
- 충분한 여유, 재시도 가능

---

## 4. Tavily 검색 최적화

### 4.1 핵심 파라미터

| 파라미터 | 값 | 설명 |
|---------|---|------|
| `search_depth` | `"basic"` / `"advanced"` | basic=1크레딧, advanced=2크레딧 |
| `topic` | `"general"` / `"news"` | 트렌드는 news, 제품 비교는 general |
| `max_results` | `8~10` | 기본값 5는 너무 적음 |
| `include_answer` | `"basic"` | LLM 요약 응답 포함 (시딩용) |
| `time_range` | `"month"` | 최신 트렌드에 사용 |
| `include_domains` | `[...]` | 권위 있는 소스 제한 |
| `exclude_domains` | `[...]` | 노이즈 소스 제외 |

### 4.2 카테고리별 멀티쿼리

하나의 아이디어를 **3가지 관점**으로 나눠 병렬 검색:

```typescript
const queries = {
  competitors: {
    query: `${idea} competitors alternatives tools`,
    topic: "general",
    search_depth: "advanced",
    max_results: 8,
    include_domains: ["producthunt.com", "g2.com", "alternativeto.net"]
  },
  trends: {
    query: `${idea} market trends growth 2025 2026`,
    topic: "news",
    search_depth: "basic",
    max_results: 8,
    time_range: "month"
  },
  technical: {
    query: `how to build ${idea} technology stack tutorial`,
    topic: "general",
    search_depth: "basic",
    max_results: 5,
    include_answer: "basic"
  }
};
```

### 4.3 결과 필터링

- **Score 기반 필터**: `score > 0.5` 이상만 사용
- **URL 기반 중복 제거**: 멀티쿼리 결과에서 URL 중복 제거
- **도메인 필터링**: 권위 있는 소스 우선 (`techcrunch.com`, `producthunt.com`, `g2.com`)

### 4.4 비용 추정

| 구성 | 크레딧 |
|------|--------|
| 경쟁사 검색 (advanced) | 2 |
| 트렌드 검색 (basic) | 1 |
| 기술 검색 (basic) | 1 |
| **1회 분석 합계** | **4 크레딧** |

무료 티어 1,000크레딧/월 기준 → **월 250회 분석 가능**

---

## 5. Phase 2: LLM 리포트 생성 (Sonnet)

### 5.1 모델 선택 전략

| 상황 | 모델 | 이유 |
|------|------|------|
| 키워드 추출 | Haiku | 빠르고 저렴, 단순 작업 |
| 일반 리포트 생성 | Sonnet | 비용/품질 균형 최적 |
| 복잡한 다분야 분석 | Opus | 규제, 보안, 멀티도메인 등 복잡한 판단 |

### 5.2 Extended Thinking 활용

Claude의 Extended Thinking으로 내부 추론을 수행하면 판정 품질이 향상된다.

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  thinking: {
    type: 'enabled',
    budget_tokens: adaptiveBudget // 2000~10000
  },
  // ...
});
```

**적응형 Thinking 예산**:

| 조건 | 추가 예산 |
|------|----------|
| 기본 | 2,000 토큰 |
| 검색 결과 10개 초과 | +2,000 |
| 결과 간 모순 발견 | +3,000 |
| 멀티도메인 쿼리 | +2,000 |
| 최대 | 10,000 토큰 |

### 5.3 프롬프트 구조

**시스템 프롬프트 구성 요소:**

1. **역할 정의**: 비개발자를 위한 기술 분석가
2. **출력 구조**: XML/마크다운 템플릿
3. **판정 보정 예시** (Few-shot): 일관된 판정 등급을 위한 참조
4. **제약 조건**: 검색 결과 기반만 사용, 없으면 confidence 낮춤

**판정 보정 Few-shot 예시:**

```xml
<rating_examples>
  <example>
    <query>뇌파로 사용자 생각을 읽어 SNS에 포스팅하는 앱</query>
    <verdict rating="현재 기술로 어려움" confidence="0.9">
      소비자용 BCI 기술이 생각 읽기 수준에 도달하지 못함.
    </verdict>
  </example>

  <example>
    <query>인스타그램 사진 분석해서 해시태그 추천하는 앱</query>
    <verdict rating="바이브코딩으로 가능" confidence="0.9">
      이미지 분석 API(Google Vision, OpenAI)가 성숙.
      유사 오픈소스 다수 존재. API 조합으로 구현 가능.
    </verdict>
  </example>

  <example>
    <query>실시간 협업 문서 에디터</query>
    <verdict rating="조건부 가능" confidence="0.85">
      Yjs, Automerge 등 CRDT 라이브러리 존재.
      WebSocket 인프라 학습 필요. 기존 프로젝트 Fork 추천.
    </verdict>
  </example>

  <example>
    <query>블록체인 기반 국가 선거 투표 시스템</query>
    <verdict rating="개발자 도움 필요" confidence="0.85">
      기술적으로는 가능하나 보안, 규제, 확장성 문제.
      전문 개발팀 필수.
    </verdict>
  </example>

  <!-- 시나리오: 터무니없는 아이디어 (Phase 0에서 IMPOSSIBLE 판정) -->
  <example>
    <query>생각만으로 앱을 조작하는 텔레파시 인터페이스</query>
    <verdict rating="현재 기술로 어려움" confidence="0.95">
      소비자용 BCI(뇌-컴퓨터 인터페이스)는 단순한 뇌파 패턴 감지만 가능.
      "생각"을 구체적 명령으로 변환하는 기술은 연구 단계.
      대안: 음성 인식 + 제스처 기반 핸즈프리 인터페이스는 바이브코딩으로 가능.
    </verdict>
  </example>

  <!-- 시나리오: 저스타 레포만 존재 (EMERGING 신호) -->
  <example>
    <query>반려식물 건강 상태를 사진으로 진단하는 앱</query>
    <ecosystem_signal>EMERGING (스타 1~8 레포 4개)</ecosystem_signal>
    <verdict rating="바이브코딩으로 가능" confidence="0.75">
      식물 질병 인식 AI 모델이 초기 단계로 존재 (TensorFlow 기반 2~3개).
      이미지 분류 API(Google Vision, Plant.id)로 대체 가능.
      유사 프로젝트가 소규모이므로 Fork보다 Build 추천.
      confidence가 낮은 이유: 성숙한 참고 프로젝트 부재로 로드맵 불확실성 존재.
    </verdict>
  </example>

  <!-- 시나리오: 신선하지만 난이도 높음 -->
  <example>
    <query>실시간 AR로 실내 길찾기 네비게이션</query>
    <complexity>HIGH</complexity>
    <verdict rating="조건부 가능" confidence="0.7">
      AR 실내 네비게이션 전체 구현은 개발자 도움이 필요하지만,
      범위를 "2D 실내 지도 + 경로 안내"로 축소하면 바이브코딩 가능.
      핵심 병목: 실내 위치 추적(BLE 비콘)은 하드웨어 인프라 필요.
      리포트에서 "바이브코딩 가능 범위"와 "전문가 필요 범위"를 분리 제시.
    </verdict>
  </example>

  <!-- 시나리오: 데이터/API 미존재 -->
  <example>
    <query>한국 전통시장 재고를 실시간으로 확인하는 앱</query>
    <data_dependency status="UNAVAILABLE">전통시장 재고 API</data_dependency>
    <verdict rating="현재 기술로 어려움" confidence="0.85">
      앱 개발 자체는 간단하지만 핵심 데이터(전통시장 재고)가 디지털화되어 있지 않음.
      이것은 코딩 문제가 아닌 데이터 인프라 문제.
      우회: 크라우드소싱, 1개 시장 특화, 공공데이터(도매시세) 피벗 등 범위 축소 전략 제시.
    </verdict>
  </example>

  <!-- 시나리오: 플랫폼 API 제한 -->
  <example>
    <query>인스타그램에 자동으로 포스팅해주는 봇</query>
    <platform_risk status="ENTERPRISE_ONLY" platform="Instagram" />
    <verdict rating="현재 기술로 어려움" confidence="0.9">
      코딩은 간단하나 Instagram API 접근이 사실상 불가.
      Graph API는 비즈니스 전용, Basic Display API는 폐지됨.
      이것은 코딩 능력이 아닌 플랫폼 정책의 문제.
      대안: Bluesky(열린 API) 자동 포스팅, 또는 콘텐츠 제작 도구로 방향 전환.
    </verdict>
  </example>

  <!-- 시나리오: 법적 리스크 -->
  <example>
    <query>딥페이크로 유명인 얼굴을 합성하는 앱</query>
    <legal_risk severity="HIGH_RISK" category="초상권, 딥페이크 규제" />
    <verdict rating="조건부 가능" confidence="0.8">
      기술적으로 쉽고 오픈소스도 풍부하나, 타인 얼굴 합성은 법적으로 심각한 문제.
      "만들 수 있는가"가 아니라 "만들어도 되는가"가 핵심.
      리포트 최상단에 법적 경고 배치. 합법적 대안(자기 얼굴만, 반려동물, 풍경) 제시.
    </verdict>
  </example>
</rating_examples>
```

### 5.4 컨텍스트 윈도우 최적화

검색 결과를 효율적으로 패킹:

1. **URL 기반 중복 제거**
2. **Score 기준 정렬** (상위 우선)
3. **개별 결과 500자 제한** (truncate)
4. **토큰 예산 내 패킹** (최대 ~8,000 토큰)
5. **배치 순서**: 최상위 3개 → 중간 → 마지막 2개 (primacy + recency 효과)

```xml
<source url="..." date="..." relevance="0.85">
  <title>프로젝트 제목</title>
  <content>설명 (500자 이내)...</content>
</source>
```

### 5.5 출력 형식: 스트리밍 친화적 마크다운

XML보다 **마크다운 출력**이 스트리밍 시 프로그레시브 렌더링에 유리:

```markdown
## 판정: 바이브코딩으로 가능
**확신도:** 0.9

판정 이유...

## 필요 기술 스택
- API: ...
- 도구: ...

## 단계별 로드맵
1. ...
2. ...

## 유사 프로젝트
| 이름 | 스타 | 기술스택 | 추천 |
|------|------|---------|------|
| ... | ... | ... | Fork |

## 시장/트렌드
- ...
```

---

## 6. 스트리밍 & 프로그레시브 UX

### 6.1 단계별 진행 표시

사용자에게 파이프라인 진행 상황을 실시간으로 보여준다:

```
[✓] 아이디어 분석 중...
[✓] GitHub에서 유사 프로젝트 검색 중... → 8개 발견
[✓] 웹에서 시장 정보 검색 중... → 12개 발견
[▶] 검증 리포트 생성 중...
    ██████████░░░░░░ 60%
```

### 6.2 Vercel AI SDK 스트리밍

```typescript
// API Route
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { query, searchResults } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: REPORT_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: formatAnalysisPrompt(query, searchResults)
    }],
  });

  return result.toDataStreamResponse();
}
```

```typescript
// Client
import { useChat } from '@ai-sdk/react';

const { messages, isLoading } = useChat({
  api: '/api/analyze',
});
```

### 6.3 섹션별 프로그레시브 렌더링

마크다운 헤딩(`##`)을 기준으로 섹션을 감지하여 완료된 섹션부터 표시:

```
[완료] ## 판정: 바이브코딩으로 가능      ← 카드 형태로 렌더링
[완료] ## 필요 기술 스택                  ← 리스트로 렌더링
[스트리밍 중] ## 단계별 로드맵...          ← 타이핑 애니메이션
[대기] ## 유사 프로젝트                    ← 스켈레톤 UI
[대기] ## 시장/트렌드                      ← 스켈레톤 UI
```

---

## 7. 채팅 모드 최적화

### 7.1 시스템 프롬프트 설계

```
당신은 이전에 사용자의 아이디어에 대한 검증 리포트를 생성한 기술 분석가입니다.

<previous_report>
{생성된 리포트 전문}
</previous_report>

규칙:
- 리포트의 내용과 판정에 일관성을 유지하라
- 리포트에서 다루지 않은 질문은 명시적으로 알려라
- 새 정보로 판정이 바뀔 경우 변경 이유를 설명하라
- 비개발자가 이해할 수 있는 용어를 사용하라
```

### 7.2 Prompt Caching 활용

시스템 프롬프트(리포트 포함)를 캐싱하여 후속 대화 비용을 90%까지 절감:

```typescript
system: [
  {
    type: 'text',
    text: SYSTEM_PROMPT + REPORT_CONTENT, // 큰 정적 프롬프트
    cache_control: { type: 'ephemeral' }  // 캐싱
  }
]
```

### 7.3 대화 히스토리 관리

- **슬라이딩 윈도우**: 최근 10개 메시지 유지 (5왕복)
- **토큰 예산**: 시스템 프롬프트 제외 최대 30,000 토큰
- **오래된 메시지**: 예산 초과 시 가장 오래된 것부터 제거

---

## 8. 에러 처리 & 폴백

### 8.1 검색 실패 시 폴백

| 실패 상황 | 폴백 전략 |
|----------|----------|
| GitHub API 장애 | Tavily 결과만으로 리포트 생성 (Build/Fork 섹션 축소) |
| Tavily API 장애 | GitHub 결과만으로 리포트 생성 (시장/트렌드 섹션 축소) |
| 둘 다 실패 | LLM 자체 지식으로 리포트 생성 (confidence 명시적으로 낮춤) |
| 검색 결과 0건 | 사용자에게 아이디어 구체화 요청 + LLM 기반 분석 |
| Rate Limit | 지수 백오프 재시도 (최대 3회) |

### 8.2 타임아웃 관리

| 단계 | 타임아웃 |
|------|---------|
| 키워드 추출 (Haiku) | 5초 |
| GitHub 검색 (개별 쿼리) | 10초 |
| Tavily 검색 (개별 쿼리) | 10초 |
| 전체 검색 단계 | 15초 (병렬이므로) |
| 리포트 생성 스트리밍 시작 | 5초 |

---

## 9. 비용 추정

### 1회 분석 비용

| 단계 | 서비스 | 비용 |
|------|--------|------|
| 키워드 추출 | Claude Haiku | ~$0.001 |
| GitHub 검색 | GitHub API | 무료 (인증 시) |
| Tavily 검색 | Tavily | 4 크레딧 (~$0.032) |
| 리포트 생성 | Claude Sonnet | ~$0.05 |
| **합계** | | **~$0.08/회** |

### Extended Thinking 사용 시

| 단계 | 비용 |
|------|------|
| 기본 분석 | ~$0.08 |
| Thinking 토큰 (5,000) | +$0.075 |
| **합계** | **~$0.15/회** |

### 후속 채팅 (Prompt Caching 적용)

- 1회 후속 응답: ~$0.02~0.04

### 월간 추정 (1,000회 분석 기준)

| 항목 | 비용 |
|------|------|
| 분석 1,000회 | ~$80~150 |
| 후속 채팅 3,000회 | ~$60~120 |
| **월 합계** | **~$140~270** |

---

## 10. 시나리오별 파이프라인 동작 정리

### 시나리오 A: 터무니없는 아이디어

**입력 예시**: "시간 여행 앱", "텔레파시 채팅", "중력 제어 앱"

```
[입력] → [Phase 0: IMPOSSIBLE 판정] → [검색 생략] → [단축 리포트]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `classification: "IMPOSSIBLE"` 반환 |
| GitHub/Tavily | **호출하지 않음** |
| Phase 2 (Sonnet) | 단축 리포트: 불가능 이유 + 현실적 대안 + 피벗 제안 |
| 비용 | ~$0.04 (일반 대비 50% 절감) |

**리포트 출력 예시**:
```markdown
## 판정: 현재 기술로 어려움
**확신도:** 0.95

시간 여행은 물리법칙상 현재 기술로는 불가능합니다.
시간의 흐름을 역행시키는 것은 일반상대성이론에서도
매우 특수한 조건에서만 이론적으로 논의되는 수준입니다.

## 혹시 이런 방향은 어떨까요?

비슷한 가치를 제공하면서 만들 수 있는 아이디어:
1. **타임캡슐 앱** — 미래의 나에게 메시지를 예약 전송 (바이브코딩으로 가능)
2. **과거 회상 앱** — 사진/일기를 날짜별로 "그때 그 순간" 되돌아보기
3. **What-if 시뮬레이터** — "만약 그때 다른 선택을 했다면?" AI 시나리오 생성
```

### 시나리오 B: 저스타(1~10) 레포만 있는 니치 아이디어

**입력 예시**: "반려식물 건강 사진 진단 앱", "수어 실시간 번역", "고양이 감정 분석"

```
[입력] → [Phase 0: SEARCHABLE] → [GitHub 1단: 결과 부족]
       → [GitHub 2단: EMERGING 신호] → [적응형 랭킹 + 활성도 보강]
       → [리포트: EMERGING 맥락 주입]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `classification: "SEARCHABLE"` 반환 |
| GitHub 1단 | `stars:>10` → 결과 0~2개 (3개 미만) |
| GitHub 2단 | `stars:>=1` → 결과 4~8개 (EMERGING 신호) |
| 랭킹 | 적응형 가중치 적용 (스타 10%, 최신성 30%, 커밋빈도 15%) |
| 보강 | README + 활성도 지표 (생성일, 커밋, 이슈, 언어 비율) |
| Phase 2 (Sonnet) | `<ecosystem_signal type="EMERGING">` 맥락 주입 |

**리포트 출력 예시**:
```markdown
## 판정: 바이브코딩으로 가능
**확신도:** 0.75

식물 질병 인식 AI 모델이 초기 단계로 존재합니다.
참고할 성숙한 프로젝트는 적지만, API 조합으로 구축 가능합니다.

## 생태계 현황
이 분야는 아직 초기 단계입니다. GitHub에서 관련 프로젝트가
소수 존재하지만 대부분 스타 10개 미만의 개인 프로젝트입니다.
→ **선점 기회가 있는 영역**으로 볼 수 있습니다.

## 유사 프로젝트
| 이름 | 스타 | 상태 | 최근 커밋 | 추천 |
|------|------|------|----------|------|
| plant-disease-detect | 8 | 활발 | 2주 전 | 참고용 |
| leaf-diagnosis-ml | 3 | 방치 | 8개월 전 | 참고 불필요 |
| flora-health-api | 5 | 활발 | 1개월 전 | Contribute 검토 |

## Build / Fork / Contribute
**추천: Build** (직접 만들기)
- 성숙한 Fork 대상이 없음
- Plant.id API + Google Vision API 조합으로 빠르게 MVP 가능
- flora-health-api에 Contribute도 고려할 수 있으나 규모가 작아 직접 만드는 것이 효율적
```

### 시나리오 C: 관련 레포 0건 (NOVEL 신호)

**입력 예시**: 매우 독창적이거나 지나치게 세부적인 아이디어

```
[입력] → [Phase 0: SEARCHABLE] → [GitHub 1단+2단: 0건]
       → [NOVEL 신호] → [Tavily 결과 중심으로 리포트]
```

| 단계 | 동작 |
|------|------|
| GitHub | 1단+2단 모두 0건 |
| Tavily | 기술 기사, 관련 제품 탐색 결과로 판단 |
| Phase 2 | `<ecosystem_signal type="NOVEL">` 주입, Tavily 결과에 가중치 |
| Build/Fork/Contribute | Build만 해당, "처음부터 만드는 부담" 명시 |

### 시나리오 D: 신선하지만 구현 난이도가 높은 아이디어

**입력 예시**: "AR로 실내 길찾기", "실시간 영상 스타일 변환", "자연어로 3D 모델 생성"

이들은 **물리적으로 가능하고 유사 연구도 있지만**, 바이브코더가 혼자 만들기엔 난이도가 너무 높다.
Phase 0에서 `complexity: "HIGH"` 또는 `"VERY_HIGH"`로 감지된다.

```
[입력] → [Phase 0: SEARCHABLE, complexity: HIGH]
       → [검색 수행] → [EMERGING 또는 ESTABLISHED]
       → [리포트: 복잡도 경고 + 단계 분리 로드맵]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `classification: "SEARCHABLE"`, `complexity: "HIGH"` |
| 검색 | 정상 수행 (관련 논문, 프레임워크 발견) |
| Phase 2 (Sonnet) | 복잡도 맥락 주입 → 판정 하향 조정 |

**리포트 프롬프트에 주입되는 맥락:**

```xml
<complexity_warning level="HIGH">
이 아이디어의 핵심 기능은 높은 기술 복잡도를 요구합니다.
비개발자가 AI 도구만으로 구현하기 어려운 부분을 반드시 명시하십시오.

리포트에서 다음을 반드시 포함하라:
1. "바이브코딩으로 가능한 부분"과 "전문 지식이 필요한 부분"을 명확히 분리
2. MVP 범위를 축소하여 바이브코딩 가능한 최소 버전 제안
3. 복잡한 부분을 대체할 수 있는 기존 API/서비스가 있으면 제시
</complexity_warning>
```

**리포트 출력 예시:**
```markdown
## 판정: 조건부 가능
**확신도:** 0.7

실시간 AR 실내 네비게이션의 전체 구현은 개발자 도움이 필요하지만,
범위를 줄이면 바이브코딩으로 시작할 수 있습니다.

## 난이도 분석

| 부분 | 난이도 | 바이브코딩 가능? |
|------|--------|----------------|
| 실내 지도 표시 (2D) | 낮음 | 가능 — Mapbox/Leaflet |
| AR 카메라 오버레이 | 높음 | 어려움 — ARKit/ARCore 전문 지식 |
| 실내 위치 추적 | 매우 높음 | 불가 — BLE 비콘 인프라 필요 |

## 바이브코딩으로 가능한 MVP
"AR 실내 네비" 대신 **"2D 실내 지도 + 경로 안내 웹앱"**으로 시작하면
바이브코딩으로 가능합니다:
1. 건물 평면도 이미지 위에 경로 표시 (canvas/SVG)
2. 사용자가 현재 위치를 수동 선택
3. A* 알고리즘으로 최단 경로 계산 (라이브러리 있음)

이후 AR과 자동 위치 추적은 개발자 도움을 받아 확장할 수 있습니다.
```

### 시나리오 E: 필요한 데이터/API가 존재하지 않는 아이디어

**입력 예시**: "한국 전통시장 실시간 재고 확인", "모든 건물의 실내 3D 지도", "실시간 약국 재고 조회"

이들은 기술적으로는 가능하지만, **필요한 데이터 자체가 디지털화되지 않았거나 접근할 수 없다.**
Phase 0에서 `data_dependencies`에 `"UNAVAILABLE"` 항목이 감지된다.

```
[입력] → [Phase 0: SEARCHABLE, data_dep: UNAVAILABLE]
       → [검색 수행] → [데이터 부재 확인]
       → [리포트: 데이터 병목 명시 + 우회 전략]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `data_dependencies: [{name: "전통시장 재고 API", status: "UNAVAILABLE"}]` |
| 검색 | 정상 수행 — 관련 시도, 유사 해외 사례 탐색 |
| Phase 2 (Sonnet) | 매트릭스 기반 판정 가이드 + 데이터 병목 맥락 주입 |

**리포트 프롬프트에 주입되는 맥락:**

```xml
<data_dependency_warning>
이 아이디어에 필요한 다음 데이터/API가 현재 존재하지 않습니다:

<dependency name="전통시장 재고 데이터" status="UNAVAILABLE">
  한국 전통시장의 재고 정보는 디지털화되어 있지 않으며,
  이를 제공하는 공개 API도 존재하지 않습니다.
</dependency>

이 경우 복잡도와 무관하게 판정을 보수적으로 내리십시오.
반드시 다음을 포함하라:
1. 왜 이 데이터가 없는지 (디지털화 미비, 비공개, 표준 부재 등)
2. 데이터 없이 우회할 수 있는 전략이 있는지
3. 데이터 범위를 축소하면 가능해지는지 (예: 1개 시장만, 특정 품목만)
4. 유사한 해외 사례에서는 어떻게 해결했는지
</data_dependency_warning>
```

**리포트 출력 예시:**
```markdown
## 판정: 현재 기술로 어려움
**확신도:** 0.85

기술적으로 "재고 조회 앱"을 만드는 것은 간단하지만,
핵심 문제는 **전통시장 재고 데이터 자체가 존재하지 않는다**는 점입니다.

## 왜 어려운가 — 데이터 병목

| 필요 데이터 | 상태 | 설명 |
|------------|------|------|
| 전통시장 재고 | 미존재 | 대부분의 전통시장 상인은 POS 시스템 미사용 |
| 시장 상점 목록 | 부분 존재 | 소상공인진흥공단 데이터 일부 공개 |
| 상품 가격 정보 | 부분 존재 | 한국농수산식품유통공사 일부 품목만 |

## 이 앱은 "코딩 문제"가 아니라 "데이터 수집 문제"입니다
아무리 좋은 앱을 만들어도 데이터가 없으면 빈 화면만 보입니다.
이것은 바이브코딩의 한계가 아니라, 인프라의 문제입니다.

## 우회 전략 — 범위를 줄이면 가능합니다

### 전략 1: 크라우드소싱 방식 (바이브코딩으로 가능)
사용자가 직접 재고/가격 정보를 올리는 커뮤니티 앱으로 전환
→ "당근마켓"처럼 사용자 생성 콘텐츠(UGC) 모델

### 전략 2: 1개 시장 특화 (바이브코딩으로 가능)
특정 시장 하나와 협업하여 직접 데이터 입력 시스템 구축
→ 시장 상인용 간단 입력 앱 + 소비자용 조회 앱

### 전략 3: 공공데이터 활용 (바이브코딩으로 가능)
실시간 재고 대신 **농수산물 도매 시세 조회**로 피벗
→ 한국농수산식품유통공사 API (공개, 무료) 활용 가능
```

### 시나리오 F: 복잡도 + 데이터 병목이 겹치는 최악의 경우

**입력 예시**: "모든 건물의 실내 3D AR 네비게이션"

복잡도 HIGH + 데이터 UNAVAILABLE → 매트릭스 상 **"현재 기술로 어려움"**

```
Phase 0 결과:
{
  "classification": "SEARCHABLE",
  "complexity": "VERY_HIGH",
  "data_dependencies": [
    {"name": "건물 실내 3D 데이터", "status": "UNAVAILABLE", "detail": "..."},
    {"name": "실내 BLE 비콘 인프라", "status": "UNAVAILABLE", "detail": "..."},
    {"name": "AR 프레임워크", "status": "AVAILABLE_FREE", "detail": "ARKit, ARCore"}
  ]
}
```

이 경우 리포트는:
1. **"현재 기술로 어려움"** 판정 (매트릭스 기반)
2. AVAILABLE인 부분과 UNAVAILABLE인 부분을 명확히 분리
3. **범위 축소 피벗**: "모든 건물" → "우리 학교 캠퍼스 1곳" 등
4. 축소된 버전에 대해 **재판정** 제시 (예: "1개 건물 2D 지도는 바이브코딩 가능")

### 시나리오 G: 플랫폼 API가 제한된 아이디어

**입력 예시**: "인스타그램 자동 포스팅 봇", "카카오톡 자동응답 봇", "트위터 팔로워 분석기"

이들은 **기술적으로 쉽고 데이터도 존재하지만**, 핵심 플랫폼의 API 정책이 개인 개발자를 차단한다.
Phase 0에서 `platform_risk`가 `REVIEW_REQUIRED` 또는 `ENTERPRISE_ONLY`로 감지된다.

**이 시나리오가 가장 위험한 이유:**
현재 파이프라인 없이는 "바이브코딩으로 가능"이라고 오판 → 바이브코더가 며칠 코딩 →
API 키 신청 거부 → **시간 완전 낭비**

```
[입력] → [Phase 0: SEARCHABLE, platform: ENTERPRISE_ONLY]
       → [검색 수행] → [ESTABLISHED 신호 + 관련 레포 다수]
       → [리포트: 플랫폼 제한 오버라이드 → 판정 하향]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `platform_risk: {status: "ENTERPRISE_ONLY", platform: "Instagram"}` |
| 매트릭스 판정 | LOW + AVAILABLE_PAID = "조건부 가능" |
| 오버라이드 | ENTERPRISE_ONLY → **"현재 기술로 어려움"** |
| Tavily 검색 | 플랫폼 정책 변경 이력, 대안 API 탐색 |

**Phase 0 출력 예시:**
```json
{
  "classification": "SEARCHABLE",
  "complexity": "LOW",
  "data_dependencies": [
    {"name": "Instagram Graph API", "status": "RESTRICTED",
     "detail": "비즈니스 계정 + Meta 앱 심사 필요, 개인 개발자 승인 극히 어려움"}
  ],
  "platform_risk": {
    "status": "ENTERPRISE_ONLY",
    "platform": "Instagram",
    "detail": "Graph API는 앱 심사를 통과한 비즈니스만 사용 가능. Basic Display API는 2024년 폐지됨."
  },
  "legal_risks": [{"severity": "CAUTION", "category": "약관위반",
    "detail": "자동 포스팅은 Instagram 이용약관 위반 가능, 계정 정지 리스크"}],
  "reason": "앱 개발 자체는 간단하나 Instagram API 접근이 사실상 불가",
  "alternative": "Unsplash/Pixabay 등 열린 API 기반 이미지 서비스로 전환"
}
```

**리포트 출력 예시:**
```markdown
## 판정: 현재 기술로 어려움
**확신도:** 0.9

인스타그램 자동 포스팅 봇의 코딩 자체는 간단하지만,
**Instagram API 접근이 사실상 불가능**하기 때문에 만들 수 없습니다.

## 왜 어려운가 — 플랫폼 API 제한

| 정책 | 내용 |
|------|------|
| Graph API | Meta 앱 심사 필수, 비즈니스 계정만 가능 |
| Basic Display API | 2024년 12월 폐지됨 |
| 자동 포스팅 | 이용약관에서 명시적 금지, 계정 정지 위험 |
| 개인 개발자 승인율 | 극히 낮음 (수개월 심사, 거부 다수) |

## 이것은 "코딩 능력" 문제가 아닙니다
개발자가 만들어도 같은 벽에 부딪힙니다.
문제는 기술이 아니라 **플랫폼 정책**입니다.

## 대안 — 같은 가치를 다른 방식으로

### 전략 1: 플랫폼을 바꾸기 (바이브코딩으로 가능)
Bluesky, Mastodon 등 열린 API 기반 SNS에서 자동 포스팅
→ Bluesky API는 개인 개발자 자유 사용 가능

### 전략 2: 방향 전환 (바이브코딩으로 가능)
자동 포스팅 대신 **콘텐츠 사전 제작 + 예약 관리 도구**
→ 사용자가 수동으로 포스팅하되, 콘텐츠 생성/관리를 도와주는 앱
→ Instagram API 불필요 (앱 내에서 작성 → 사용자가 직접 복사-붙여넣기)

### 전략 3: 승인 가능한 범위로 축소
Instagram 공식 파트너 프로그램 없이도 가능한 기능만 사용:
→ 해시태그 분석 (웹 크롤링 기반), 최적 포스팅 시간 추천 (통계 기반)
```

### 시나리오 H: 법적/규제 리스크가 있는 아이디어

**입력 예시**: "딥페이크 얼굴 합성 앱", "웹사이트 콘텐츠 자동 크롤링 수집기", "사용자 위치 실시간 공유"

이들은 **기술적으로 쉽고, API도 있고, 코딩도 가능하지만** 법적으로 위험하다.
Phase 0에서 `legal_risks`에 `HIGH_RISK`가 감지된다.

**핵심 원칙:** "만들 수 있는가"보다 **"만들어도 되는가"**를 먼저 답한다.

```
[입력] → [Phase 0: SEARCHABLE, legal: HIGH_RISK]
       → [검색 수행] → [ESTABLISHED + 관련 라이브러리 다수]
       → [리포트: 법적 경고 최상단 배치 + 합법적 대안]
```

| 단계 | 동작 |
|------|------|
| Phase 0 (Haiku) | `legal_risks: [{severity: "HIGH_RISK", category: "초상권"}]` |
| 매트릭스 판정 | LOW + AVAILABLE_FREE = "바이브코딩으로 가능" |
| 법적 오버라이드 | HIGH_RISK → 최소 "조건부 가능" + 법적 경고 최상단 |
| Tavily 검색 | 관련 법률 판례, 규제 동향 추가 검색 |

**Tavily에 법적 검색 쿼리 추가:**
`legal_risks`가 CAUTION 이상이면 기존 3개 쿼리에 **법률 쿼리 1개를 자동 추가**한다.

```typescript
if (phase0.legal_risks.some(r => r.severity !== "NONE")) {
  queries.legal = {
    query: `${idea} legal issues regulation compliance ${phase0.legal_risks[0].category}`,
    topic: "general",
    search_depth: "advanced",
    max_results: 5,
    include_domains: ["law.go.kr", "legalengine.co.kr"]
  };
}
```

**리포트 출력 예시:**
```markdown
## 법적 경고

이 아이디어를 구현하기 전에 반드시 알아야 할 법적 리스크가 있습니다.

| 리스크 | 관련 법률 | 위반 시 결과 |
|--------|---------|------------|
| 초상권 침해 | 민법 제751조 | 손해배상 청구, 서비스 중단 명령 |
| 딥페이크 규제 | 성폭력처벌법 제14조의2 | 5년 이하 징역 (성적 딥페이크) |
| 개인정보 | 개인정보보호법 제15조 | 5천만원 이하 과태료 |

## 판정: 조건부 가능
**확신도:** 0.8

딥페이크 얼굴 합성 기술 자체는 바이브코딩으로 구현 가능하지만,
**사용 목적과 방식에 따라 심각한 법적 문제**가 발생합니다.

## 합법적으로 같은 가치를 제공하는 방법

### 전략 1: 자기 자신만 대상 (합법)
본인 사진만 가공하는 "셀카 스타일 변환" 앱
→ 타인 사진 업로드 차단 + 얼굴 인식으로 본인 확인
→ 이 범위는 바이브코딩으로 가능

### 전략 2: 동의 기반 시스템 (합법)
피사체의 명시적 동의를 받는 프로세스 내장
→ 동의서 서명 → 합성 → 워터마크 포함 결과물
→ 상업 사진관, 웨딩 업계 등 B2B 모델

### 전략 3: 비사람 대상으로 전환 (합법)
얼굴 합성 대신 **반려동물 스타일 변환**, **풍경 사진 화풍 변환** 등
→ 초상권 이슈 없음, 동일한 AI 기술 활용 가능
```

---

## 11. 핵심 최적화 포인트 요약

| # | 최적화 | 효과 |
|---|--------|------|
| 1 | Phase 0 사전 심사 (IMPOSSIBLE 분류) | 터무니없는 아이디어에서 비용 50% 절감, 대안 제안 |
| 2 | Phase 0 복잡도 평가 (LOW~VERY_HIGH) | 난이도 높은 아이디어의 오판 방지 |
| 3 | Phase 0 데이터/API 가용성 검증 | "데이터 없음" 병목 사전 감지 |
| 4 | Phase 0 플랫폼 API 리스크 감지 | "API 있는 척" 오판 차단 (가장 위험한 케이스) |
| 5 | Phase 0 법적/규제 리스크 감지 | "만들어도 되는가"를 "만들 수 있는가"보다 먼저 답변 |
| 6 | 복잡도 × 가용성 판정 매트릭스 + 리스크 오버라이드 | 다축 조합을 체계적으로 판정 |
| 7 | Haiku로 키워드 추출 분리 | 검색 품질 ↑, 비용 ↓ |
| 8 | GitHub 2단 검색 전략 | 니치 분야 커버리지 ↑ (저스타 레포 발견) |
| 9 | 생태계 성숙도 신호 (ESTABLISHED/EMERGING/NOVEL) | 맥락에 맞는 판정 ↑ |
| 10 | 신호별 적응형 랭킹 가중치 | 저스타 환경에서 랭킹 정확도 ↑ |
| 11 | EMERGING 활성도 보강 (커밋, 이슈, 언어) | 방치 vs 활발 프로젝트 구별 |
| 12 | Tavily 카테고리별 검색 분리 + 법률 쿼리 자동 추가 | 시장 인텔리전스 ↑, 법적 리스크 근거 확보 |
| 13 | Extended Thinking (적응형) | 판정 품질 ↑ (복잡한 케이스) |
| 14 | Few-shot 판정 보정 (8개 시나리오 포함) | 판정 등급 일관성 ↑ |
| 15 | 복잡도 경고 + MVP 축소 제안 | 고난도 아이디어에서 실행 가능한 시작점 제공 |
| 16 | 데이터 병목 분석 + 우회 전략 | "데이터 없음"에 대한 구체적 대안 제시 |
| 17 | 플랫폼 우회 전략 (대체 플랫폼, 기능 축소) | "API 막힘"에 대한 실행 가능한 피벗 제시 |
| 18 | 합법적 대안 제시 (법적 리스크) | 법적으로 안전한 동일 가치 서비스 방향 제안 |
| 19 | 프로그레시브 스트리밍 렌더링 | 체감 응답 속도 ↑ |
| 20 | Prompt Caching (채팅) | 후속 대화 비용 90% ↓ |
| 21 | 폴백 전략 | 안정성 ↑ |
