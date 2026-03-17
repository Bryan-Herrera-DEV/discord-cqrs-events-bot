export interface RateLimiterResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export interface RateLimiter {
  consume(key: string): Promise<RateLimiterResult>;
}
