import { describe, it, expect } from "vitest";
import { ping } from "../src/smoke";

describe("harness", () => {
  it("runs vitest against TypeScript", () => {
    expect(ping()).toBe("pong");
  });
});
