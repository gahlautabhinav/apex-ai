import { describe, it, expect, vi } from "vitest";
import { ClaudeCliClient, type CommandRunner } from "../src";
import type { LlmRequest } from "@apex/ai-thinkscript";

const ok = (text: string) =>
  JSON.stringify({ type: "result", is_error: false, result: text });

const req = (over: Partial<LlmRequest> = {}): LlmRequest => ({
  system: "SYS",
  messages: [{ role: "user", content: "hi" }],
  model: "claude-sonnet-4-6",
  ...over,
});

describe("ClaudeCliClient", () => {
  it("invokes claude -p with system prompt, mapped model, and json format", async () => {
    let seen: { args: string[]; stdin: string } | undefined;
    const run: CommandRunner = async (args, stdin) => {
      seen = { args, stdin };
      return { stdout: ok("plot X = close;"), stderr: "", exitCode: 0 };
    };
    const out = await new ClaudeCliClient({ run }).complete(req());
    expect(out).toBe("plot X = close;");
    expect(seen!.args).toContain("-p");
    expect(seen!.args).toContain("--output-format");
    expect(seen!.args).toContain("json");
    const sysIdx = seen!.args.indexOf("--system-prompt");
    expect(seen!.args[sysIdx + 1]).toBe("SYS");
    const modelIdx = seen!.args.indexOf("--model");
    expect(seen!.args[modelIdx + 1]).toBe("sonnet");
  });

  it("pipes the flattened conversation to stdin", async () => {
    let stdinSeen = "";
    const run: CommandRunner = async (_args, stdin) => {
      stdinSeen = stdin;
      return { stdout: ok("ok"), stderr: "", exitCode: 0 };
    };
    await new ClaudeCliClient({ run }).complete(
      req({
        model: "claude-haiku-4-5",
        messages: [
          { role: "user", content: "a" },
          { role: "assistant", content: "b" },
          { role: "user", content: "c" },
        ],
      }),
    );
    expect(stdinSeen).toBe("User: a\n\nAssistant: b\n\nUser: c");
  });

  it("throws on a non-zero exit code", async () => {
    const run: CommandRunner = async () => ({ stdout: "", stderr: "boom", exitCode: 1 });
    await expect(new ClaudeCliClient({ run }).complete(req())).rejects.toThrow(/boom/);
  });

  it("throws when the CLI reports an error in JSON", async () => {
    const run: CommandRunner = async () => ({
      stdout: JSON.stringify({ is_error: true, result: "nope" }),
      stderr: "",
      exitCode: 0,
    });
    await expect(new ClaudeCliClient({ run }).complete(req())).rejects.toThrow(/nope/);
  });

  it("warns when ANTHROPIC_API_KEY is set and no runner is injected", () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      new ClaudeCliClient();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("ANTHROPIC_API_KEY"));
    } finally {
      warn.mockRestore();
      if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("does not warn when a runner is injected", () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      new ClaudeCliClient({ run: async () => ({ stdout: "", stderr: "", exitCode: 0 }) });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
