// 速率限制处理模块
export interface RateLimitConfig {
  initialRequestSize: number;
  minRequestSize: number;
  maxRetries: number;
}

export interface RateLimitState {
  currentRequestSize: number;
  retryCount: number;
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 检查速率限制头部信息并等待（如果需要）
export async function checkRateLimitHeaders(headers: any, retryCount = 0): Promise<void> {
  const retryAfter = headers['retry-after'];
  const ratelimitRemaining = headers['x-ratelimit-remaining'];
  const ratelimitReset = headers['x-ratelimit-reset'];

  let waitTimeMs = 0;

  if (retryAfter) {
    // 如果有retry-after头部，等待指定的秒数
    waitTimeMs = parseInt(retryAfter) * 1000;
    console.log(`Retry-after header present: ${retryAfter} seconds`);
  } else if (ratelimitRemaining === '0' && ratelimitReset) {
    // 如果x-ratelimit-remaining为0，等待到x-ratelimit-reset时间
    const resetTime = parseInt(ratelimitReset) * 1000; // 转换为毫秒
    const now = Date.now();
    waitTimeMs = Math.max(0, resetTime - now);
    console.log(`Rate limit remaining is 0, reset at ${new Date(resetTime).toISOString()}`);
  } else if (parseInt(ratelimitRemaining) <= 5) {
    // 如果速率限制即将用完(<= 5 remaining)，使用小延迟作为预防
    console.log('Rate limit running low, using precautionary delay');
    waitTimeMs = 5000; // 5秒
  }

  // 如果这是重试，应用指数退避
  if (retryCount > 0) {
    const backoffTime = 60000 * Math.pow(2, retryCount - 1); // 60s, 120s, 240s, 480s, 960s
    waitTimeMs = Math.max(waitTimeMs, backoffTime);
    console.log(`Applying exponential backoff for retry ${retryCount}: ${backoffTime}ms`);
  }

  if (waitTimeMs > 0) {
    const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
    console.log(`Waiting ${waitTimeSeconds} seconds due to rate limit headers...`);
    await delay(waitTimeMs);
  }
}

// 处理速率限制的函数
export async function handleRateLimit(
  fn: () => Promise<any>, 
  maxRetries = 5
): Promise<any> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 执行函数
      const result = await fn();

      // 检查结果是否有头部信息（成功响应）
      if (result?.headers) {
        await checkRateLimitHeaders(result.headers, retryCount);
      }

      return result;
    } catch (error: any) {
      retryCount++;

      // 检查是否是速率限制错误
      const isRateLimitError = error.message?.includes('rate limit') ||
        error.message?.includes('secondary rate limit') ||
        error.message?.includes('API rate limit exceeded') ||
        (error.status === 403 && error.message?.includes('API rate limit exceeded')) ||
        (error.status === 200 && error.message?.includes('secondary rate limit'));

      if (!isRateLimitError || retryCount >= maxRetries) {
        throw error;
      }

      console.log(`Rate limit hit (attempt ${retryCount}/${maxRetries})`);

      // 检查响应头部
      const headers = error.headers || {};
      await checkRateLimitHeaders(headers, retryCount);
    }
  }

  throw new Error(`Maximum retries (${maxRetries}) exceeded due to rate limiting`);
}