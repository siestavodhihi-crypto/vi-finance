/**
 * lib/rate-limit.ts
 * Giới hạn tốc độ gọi API theo từng người dùng (sliding window in-memory).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export class SlidingWindowRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string, now: number = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      const oldest = recent[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0, retryAfterSec };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      retryAfterSec: 0,
    };
  }
}

// Mặc định: tối đa 10 lượt quét hóa đơn / 10 phút / người dùng
export const receiptScanLimiter = new SlidingWindowRateLimiter(10, 10 * 60 * 1000);
