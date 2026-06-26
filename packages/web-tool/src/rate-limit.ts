export interface RateLimiter {
  check(key: string): boolean;
}

// Per-key fixed-window limiter. `now` is injectable for deterministic tests.
export function fixedWindowLimiter(
  maxPerWindow: number,
  windowMs: number,
  now: () => number = () => Date.now(),
): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): boolean {
      const t = now();
      const entry = hits.get(key);
      if (!entry || t >= entry.resetAt) {
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return true;
      }
      if (entry.count >= maxPerWindow) {
        return false;
      }
      entry.count++;
      return true;
    },
  };
}
