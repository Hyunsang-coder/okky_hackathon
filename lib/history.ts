export interface HistoryEntry {
  id: string;
  idea: string;
  verdict: string;
  date: string;
  report: string;
  searchContext?: string;
}

const STORAGE_KEY = "vibcheck-history";
const MAX_ENTRIES = 20;

function getEntries(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getHistory(): HistoryEntry[] {
  return getEntries();
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "date">): void {
  const entries = getEntries();
  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  entries.unshift(newEntry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return getEntries().find((e) => e.id === id);
}

export function findMatchingHistory(idea: string): HistoryEntry | undefined {
  const normalized = idea
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[.!?。！？]+$/, "");
  return getEntries().find((e) => {
    const entryNorm = e.idea
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/[.!?。！？]+$/, "");
    return entryNorm === normalized;
  });
}
