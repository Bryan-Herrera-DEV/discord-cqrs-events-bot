import type {
  RateLimiter,
  RateLimiterResult
} from "@shared/infrastructure/rate-limit/RateLimiter";

interface Bucket {
  tokens: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  public constructor(
    private readonly maxTokens: number,
    private readonly intervalMs: number
  ) {}

  public async consume(key: string): Promise<RateLimiterResult> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      const bucket: Bucket = {
        tokens: this.maxTokens - 1,
        resetAt: now + this.intervalMs
      };
      this.buckets.set(key, bucket);
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: bucket.tokens
      };
    }

    if (existing.tokens <= 0) {
      return {
        allowed: false,
        retryAfterMs: existing.resetAt - now,
        remaining: 0
      };
    }

    existing.tokens -= 1;
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: existing.tokens
    };
  }
}
