import { isRateLimitError, getErrorMessage } from './errorHandler';

export interface RateLimitConfig {
  initialRequestSize: number;
  minRequestSize: number;
  maxRetries: number;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RateLimitHeaders {
  'retry-after'?: string;
  'x-ratelimit-remaining'?: string;
  'x-ratelimit-reset'?: string;
  [key: string]: string | undefined;
}

async function waitForRateLimit(headers: RateLimitHeaders, retryCount: number): Promise<void> {
  const retryAfter = headers['retry-after'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];

  let waitTimeMs = 0;

  if (retryAfter) {
    waitTimeMs = parseInt(retryAfter) * 1000;
    console.log(`Retry-after header: ${retryAfter}s`);
  } else if (remaining === '0' && reset) {
    const resetTime = parseInt(reset) * 1000;
    waitTimeMs = Math.max(0, resetTime - Date.now());
    console.log(`Rate limit exhausted, reset at ${new Date(resetTime).toISOString()}`);
  } else if (remaining && parseInt(remaining) <= 5) {
    console.log(`Rate limit running low (${remaining} remaining), precautionary delay`);
    waitTimeMs = 5000;
  }

  if (retryCount > 0) {
    const backoffTime = 60000 * Math.pow(2, retryCount - 1);
    waitTimeMs = Math.max(waitTimeMs, backoffTime);
    console.log(`Exponential backoff for retry ${retryCount}: ${backoffTime}ms`);
  }

  if (waitTimeMs > 0) {
    console.log(`Waiting ${Math.ceil(waitTimeMs / 1000)}s for rate limit...`);
    await delay(waitTimeMs);
  }
}

export async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let retryCount = 0;

  while (true) {
    try {
      const result = await fn();

      const resultWithHeaders = result as { headers?: RateLimitHeaders };
      if (resultWithHeaders?.headers) {
        await waitForRateLimit(resultWithHeaders.headers, retryCount);
      }

      return result;
    } catch (error: unknown) {
      retryCount++;

      if (!isRateLimitError(error) || retryCount >= maxRetries) {
        throw error;
      }

      console.log(
        `Rate limit hit (attempt ${retryCount}/${maxRetries}): ${getErrorMessage(error)}`
      );

      const headers: RateLimitHeaders = (error as { headers?: RateLimitHeaders }).headers ?? {};
      await waitForRateLimit(headers, retryCount);
    }
  }
}
