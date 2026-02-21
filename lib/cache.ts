// ---------- TTLCache ----------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxSize: number;

  constructor(opts: { defaultTTL: number; maxSize: number }) {
    this.defaultTTL = opts.defaultTTL;
    this.maxSize = opts.maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // evict expired entries first
    if (this.map.size >= this.maxSize) {
      const now = Date.now();
      for (const [k, v] of this.map) {
        if (now > v.expiresAt) this.map.delete(k);
      }
    }
    // still full → delete oldest
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

// ---------- Key utilities ----------

export function normalizeIdea(idea: string): string {
  return idea
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[.!?。！？]+$/, "");
}

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function hashKey(input: string): string {
  return djb2(input);
}

export function keywordCacheKey(idea: string): string {
  return `kw:${hashKey(normalizeIdea(idea))}`;
}

export function githubCacheKey(
  queries: string[],
  topics: string[],
  koQueries?: string[],
): string {
  const sorted = [...queries, ...topics, ...(koQueries ?? [])].sort().join("|");
  return `gh:${hashKey(sorted)}`;
}

export function tavilyCacheKey(queries: {
  competitors: string;
  trends: string;
  technical: string;
  korean?: string;
}): string {
  const combined = [
    queries.competitors,
    queries.trends,
    queries.technical,
    queries.korean ?? "",
  ].join("|");
  return `tv:${hashKey(combined)}`;
}

// ---------- Singleton instances ----------

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const keywordCache = new TTLCache<unknown>({
  defaultTTL: 24 * HOUR,
  maxSize: 200,
});

export const githubCache = new TTLCache<unknown>({
  defaultTTL: 1 * HOUR,
  maxSize: 100,
});

export const tavilyCache = new TTLCache<unknown>({
  defaultTTL: 30 * MINUTE,
  maxSize: 100,
});
