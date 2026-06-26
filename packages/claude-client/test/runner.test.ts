import { describe, it, expect } from "vitest";
import { spawnRunner } from "../src/runner";

describe("spawnRunner (real spawn via node)", () => {
  it("resolves with exit code 0", async () => {
    const res = await spawnRunner("node")(["-e", "process.exit(0)"], "");
    expect(res.exitCode).toBe(0);
  });

  it("reports a non-zero exit code", async () => {
    const res = await spawnRunner("node")(["-e", "process.exit(2)"], "");
    expect(res.exitCode).toBe(2);
  });

  it("captures stdout", async () => {
    const res = await spawnRunner("node")(["-e", "process.stdout.write('hello')"], "");
    expect(res.stdout).toBe("hello");
    expect(res.exitCode).toBe(0);
  });

  it("kills and rejects on timeout", async () => {
    await expect(
      spawnRunner("node", 150)(["-e", "setInterval(() => {}, 1000)"], ""),
    ).rejects.toThrow(/timed out/);
  });

  it("rejects with a clear error when the command is missing", async () => {
    await expect(
      spawnRunner("definitely-not-a-real-binary-xyz-123")([], ""),
    ).rejects.toThrow(/installed and on PATH/);
  });
});
