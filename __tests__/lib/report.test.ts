import { describe, it, expect } from "vitest";
import { parseReport, isVerdict, VERDICTS } from "@/lib/report";

describe("isVerdict", () => {
  it("유효한 판정 문자열을 인식한다", () => {
    for (const v of VERDICTS) {
      expect(isVerdict(v)).toBe(true);
    }
  });

  it("유효하지 않은 문자열을 거부한다", () => {
    expect(isVerdict("알 수 없음")).toBe(false);
    expect(isVerdict("")).toBe(false);
    expect(isVerdict("바이브코딩")).toBe(false);
  });
});

describe("parseReport", () => {
  const FULL_REPORT = `## 판정: 바이브코딩으로 가능
**확신도:** 0.85

API 조합으로 충분히 구현할 수 있습니다.

## 필요 기술 스택
- Next.js — 웹 프레임워크
- OpenAI API — 이미지 분석

## 단계별 로드맵
1. **MVP 설계** — 핵심 기능 정의
2. **프론트엔드 구현** — UI 제작

## 유사 프로젝트
| 이름 | 스타 | 기술스택 | 추천 |
|------|------|---------|------|
| example | 120 | React | Build |

## 시장/트렌드
- AI 이미지 분석 수요 증가`;

  it("전체 리포트에서 판정과 확신도를 파싱한다", () => {
    const result = parseReport(FULL_REPORT);
    expect(result.verdict).toBe("바이브코딩으로 가능");
    expect(result.confidence).toBe(0.85);
  });

  it("모든 섹션을 올바르게 분리한다", () => {
    const result = parseReport(FULL_REPORT);
    expect(result.sections).toHaveLength(5);
    expect(result.sections[0].isVerdict).toBe(true);
    expect(result.sections[1].heading).toBe("## 필요 기술 스택");
    expect(result.sections[1].isVerdict).toBe(false);
  });

  it("각 판정 등급을 파싱한다", () => {
    for (const v of VERDICTS) {
      const md = `## 판정: ${v}\n**확신도:** 0.7\n\n설명`;
      const result = parseReport(md);
      expect(result.verdict).toBe(v);
    }
  });

  it("확신도가 없으면 null을 반환한다", () => {
    const md = `## 판정: 조건부 가능\n설명만 있음`;
    const result = parseReport(md);
    expect(result.verdict).toBe("조건부 가능");
    expect(result.confidence).toBeNull();
  });

  it("확신도가 0~1 범위 밖이면 null을 반환한다", () => {
    const md = `## 판정: 조건부 가능\n**확신도:** 1.5\n\n설명`;
    const result = parseReport(md);
    expect(result.confidence).toBeNull();
  });

  it("확신도가 경계값 0과 1을 허용한다", () => {
    expect(parseReport(`## 판정: 조건부 가능\n**확신도:** 0\n`).confidence).toBe(0);
    expect(parseReport(`## 판정: 조건부 가능\n**확신도:** 1\n`).confidence).toBe(1);
  });

  it("판정 섹션이 없으면 verdict/confidence 모두 null", () => {
    const md = `## 필요 기술 스택\n- React`;
    const result = parseReport(md);
    expect(result.verdict).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.sections).toHaveLength(1);
  });

  it("빈 문자열을 처리한다", () => {
    const result = parseReport("");
    expect(result.verdict).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.sections).toHaveLength(1); // empty content section
  });

  it("유효하지 않은 판정 텍스트면 verdict는 null", () => {
    const md = `## 판정: 잘못된값\n**확신도:** 0.5`;
    const result = parseReport(md);
    expect(result.verdict).toBeNull();
    expect(result.confidence).toBe(0.5);
  });

  it("확신도에 볼드 마크다운이 섞여 있어도 파싱한다", () => {
    const md = `## 판정: 바이브코딩으로 가능\n**확신도:** **0.9**`;
    const result = parseReport(md);
    expect(result.confidence).toBe(0.9);
  });
});
