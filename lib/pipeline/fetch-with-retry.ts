export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULTS: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 500,
  timeoutMs: 10_000,
};

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: RetryConfig,
): Promise<Response> {
  const { maxRetries, baseDelayMs, timeoutMs } = { ...DEFAULTS, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok || !isRetryable(res.status) || attempt === maxRetries) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      if (attempt === maxRetries) break;
    }

    // Exponential backoff: 500ms → 1000ms → 2000ms
    const delay = baseDelayMs * 2 ** attempt;
    await new Promise((r) => setTimeout(r, delay));
  }

  throw lastError;
}
