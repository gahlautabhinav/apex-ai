import { describe, it, expect } from "vitest";
import { fixedWindowLimiter } from "../src/rate-limit";

describe("fixedWindowLimiter", () => {
  it("allows up to max per window, then blocks", () => {
    let t = 1000;
    const limiter = fixedWindowLimiter(2, 100, () => t);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(false);
  });

  it("tracks keys independently", () => {
    let t = 0;
    const limiter = fixedWindowLimiter(1, 100, () => t);
    expect(limiter.check("a")).toBe(true);
    expect(limiter.check("b")).toBe(true);
    expect(limiter.check("a")).toBe(false);
  });

  it("resets after the window elapses", () => {
    let t = 0;
    const limiter = fixedWindowLimiter(1, 100, () => t);
    expect(limiter.check("ip")).toBe(true);
    expect(limiter.check("ip")).toBe(false);
    t = 100; // window elapsed
    expect(limiter.check("ip")).toBe(true);
  });
});
