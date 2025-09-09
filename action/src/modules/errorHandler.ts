// 错误处理模块

// 自定义错误类
export class GitHubApiError extends Error {
  constructor(message: string, public status?: number, public headers?: any) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class RateLimitError extends GitHubApiError {
  constructor(message: string, headers?: any) {
    super(message, 403, headers);
    this.name = 'RateLimitError';
  }
}

export class UnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownError';
  }
}

// 错误类型检查函数
export function isRateLimitError(error: any): boolean {
  return error.message?.includes('rate limit') ||
    error.message?.includes('secondary rate limit') ||
    error.message?.includes('API rate limit exceeded') ||
    (error.status === 403 && error.message?.includes('API rate limit exceeded')) ||
    (error.status === 200 && error.message?.includes('secondary rate limit'));
}

export function isGitHubApiError(error: any): boolean {
  return error instanceof GitHubApiError || 
    (error.message && (error.status || error.headers));
}

// 错误日志记录函数
export function logError(error: any, context: string): void {
  console.error(`[${context}] Error:`, error.message || error);
  
  if (error.stack) {
    console.error(`[${context}] Stack:`, error.stack);
  }
  
  if (error.status) {
    console.error(`[${context}] Status:`, error.status);
  }
  
  if (error.headers) {
    console.error(`[${context}] Headers:`, JSON.stringify(error.headers, null, 2));
  }
}

// 重试策略配置
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

// 计算重试延迟时间
export function calculateRetryDelay(retryCount: number, config: RetryConfig): number {
  const { initialDelay, maxDelay, exponentialBase } = config;
  const delay = initialDelay * Math.pow(exponentialBase, retryCount - 1);
  return Math.min(delay, maxDelay);
}