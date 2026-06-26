import { LlmClient, LlmRequest } from "@apex/ai-thinkscript";
import { CommandRunner, spawnRunner } from "./runner";
import { flattenMessages, mapModel, extractResult } from "./helpers";

export interface ClaudeCliOptions {
  // Injectable command runner (default: spawn the real `claude`). Tests use a fake.
  run?: CommandRunner;
  // Override the binary name/path (default "claude").
  command?: string;
}

// An LlmClient backed by the local Claude Code CLI (`claude -p`), so generation
// runs on the user's Claude Code subscription rather than a paid API key.
export class ClaudeCliClient implements LlmClient {
  private readonly run: CommandRunner;

  constructor(options: ClaudeCliOptions = {}) {
    if (options.run) {
      this.run = options.run;
    } else {
      this.run = spawnRunner(options.command ?? "claude");
      // The point is to run on the Claude Code subscription. If an API key is
      // set, the CLI bills that key per token instead — warn loudly.
      if (process.env.ANTHROPIC_API_KEY) {
        console.warn(
          "[apex] ANTHROPIC_API_KEY is set — the claude CLI will bill that API key per token instead of your Claude Code subscription. Unset it to use the subscription.",
        );
      }
    }
  }

  async complete(req: LlmRequest): Promise<string> {
    // req.maxTokens is intentionally not wired: `claude -p` has no clean per-call token cap.
    const args = [
      "-p",
      "--system-prompt",
      req.system,
      "--model",
      mapModel(req.model),
      "--output-format",
      "json",
    ];
    const result = await this.run(args, flattenMessages(req.messages));
    if (result.exitCode !== 0) {
      throw new Error(
        `claude CLI exited ${result.exitCode}: ${result.stderr.trim() || result.stdout.trim()}`,
      );
    }
    return extractResult(result.stdout);
  }
}
