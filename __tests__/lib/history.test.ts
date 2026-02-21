import { describe, it, expect, beforeEach, vi } from "vitest";

// window와 localStorage mock (history.ts의 typeof window === "undefined" 체크 우회)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

vi.stubGlobal("window", { localStorage: localStorageMock });
vi.stubGlobal("localStorage", localStorageMock);

let uuidCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// import AFTER globals are set
const { getHistory, addHistory, getHistoryEntry } = await import(
  "@/lib/history"
);

beforeEach(() => {
  localStorageMock.clear();
  uuidCounter = 0;
});

describe("getHistory", () => {
  it("저장소가 비어있으면 빈 배열 반환", () => {
    expect(getHistory()).toEqual([]);
  });

  it("저장된 히스토리를 반환한다", () => {
    const entries = [
      {
        id: "1",
        idea: "test",
        verdict: "조건부 가능",
        date: "2024-01-01",
        report: "report",
      },
    ];
    localStorageMock.setItem("vibcheck-history", JSON.stringify(entries));
    expect(getHistory()).toEqual(entries);
  });

  it("잘못된 JSON이면 빈 배열 반환", () => {
    localStorageMock.setItem("vibcheck-history", "invalid json{{{");
    expect(getHistory()).toEqual([]);
  });
});

describe("addHistory", () => {
  it("새 항목을 맨 앞에 추가한다", () => {
    addHistory({ idea: "첫 번째", verdict: "조건부 가능", report: "report1" });
    addHistory({
      idea: "두 번째",
      verdict: "바이브코딩으로 가능",
      report: "report2",
    });

    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].idea).toBe("두 번째");
    expect(history[1].idea).toBe("첫 번째");
  });

  it("id와 date가 자동 생성된다", () => {
    addHistory({ idea: "test", verdict: "조건부 가능", report: "report" });

    const history = getHistory();
    expect(history[0].id).toBe("test-uuid-1");
    expect(history[0].date).toBeTruthy();
    expect(new Date(history[0].date).toISOString()).toBe(history[0].date);
  });

  it("최대 20개를 초과하면 오래된 항목을 삭제한다", () => {
    for (let i = 0; i < 25; i++) {
      addHistory({
        idea: `idea-${i}`,
        verdict: "조건부 가능",
        report: `report-${i}`,
      });
    }

    const history = getHistory();
    expect(history).toHaveLength(20);
    expect(history[0].idea).toBe("idea-24");
    expect(history[19].idea).toBe("idea-5");
  });
});

describe("getHistoryEntry", () => {
  it("id로 특정 항목을 찾는다", () => {
    addHistory({ idea: "find me", verdict: "조건부 가능", report: "report" });

    const entry = getHistoryEntry("test-uuid-1");
    expect(entry).toBeDefined();
    expect(entry!.idea).toBe("find me");
  });

  it("존재하지 않는 id는 undefined 반환", () => {
    expect(getHistoryEntry("nonexistent")).toBeUndefined();
  });
});
