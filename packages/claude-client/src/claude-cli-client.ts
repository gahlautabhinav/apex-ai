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
    this.run = options.run ?? spawnRunner(options.command ?? "claude");
  }

  async complete(req: LlmRequest): Promise<string> {
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
