import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app";
import { FakeLlmClient } from "@apex/ai-thinkscript";
import { fixedWindowLimiter } from "../src/rate-limit";

const fencedText = "```thinkscript\nplot SMA = Average(close, 20);\n```\n\nA 20-period SMA.";

let current: Server | undefined;
afterEach(() => current?.close());

async function start(max = 100): Promise<string> {
  const app = createApp({
    client: new FakeLlmClient([fencedText]),
    limiter: fixedWindowLimiter(max, 60_000),
    html: "<!doctype html><title>APEX ThinkScript</title>",
  });
  current = app;
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const addr = app.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  return `http://127.0.0.1:${port}`;
}

describe("web-tool app", () => {
  it("serves the HTML page at /", async () => {
    const base = await start();
    const res = await fetch(base + "/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("APEX");
  });

  it("serves the HTML page at /index.html too", async () => {
    const base = await start();
    const res = await fetch(base + "/index.html");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("generates ThinkScript via POST /api/generate", async () => {
    const base = await start();
    const res = await fetch(base + "/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "20 period sma" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.code).toBe("plot SMA = Average(close, 20);");
    expect(json.ok).toBe(true);
    expect(json.producedCode).toBe(true);
    expect(json.reviewRequired).toBe(true);
  });

  it("returns 400 for an empty intent", async () => {
    const base = await start();
    const res = await fetch(base + "/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("rate-limits after the window max", async () => {
    const base = await start(2); // max 2 per window
    const post = () =>
      fetch(base + "/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent: "x" }),
      });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
  });

  it("404s an unknown route", async () => {
    const base = await start();
    expect((await fetch(base + "/nope")).status).toBe(404);
  });
});
