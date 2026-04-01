export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class RateLimitError extends GitHubApiError {
  constructor(message: string, headers?: Record<string, string>) {
    super(message, 403, headers);
    this.name = 'RateLimitError';
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message ?? '';
  const status = (error as { status?: number }).status;
  return (
    msg.includes('rate limit') ||
    msg.includes('secondary rate limit') ||
    msg.includes('API rate limit exceeded') ||
    (status === 403 && msg.includes('API rate limit exceeded')) ||
    (status === 200 && msg.includes('secondary rate limit'))
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
