import { spawn } from "node:child_process";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommandRunner = (args: string[], stdin: string) => Promise<CommandResult>;

// Default timeout for a single `claude` invocation (ms).
export const DEFAULT_TIMEOUT_MS = 120_000;

// Default runner: spawns the real `claude` binary (a native executable on PATH;
// shell:false is correct on Windows for a native .exe). Writes `stdin`, drains
// stdout/stderr, and kills + rejects if the process exceeds `timeoutMs`.
// Inherits the parent env, so the existing Claude Code login is used.
export function spawnRunner(command = "claude", timeoutMs = DEFAULT_TIMEOUT_MS): CommandRunner {
  return (args, stdin) =>
    new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(new Error(`claude CLI timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (d: string) => (stdout += d));
      child.stderr.on("data", (d: string) => (stderr += d));
      child.stdout.on("error", () => {});
      child.stderr.on("error", () => {});

      child.once("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(
          new Error(
            `failed to run "${command}": ${err.message}. Is the Claude Code CLI installed and on PATH (native installer, so "${command}" is an executable)?`,
          ),
        );
      });

      child.once("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      child.stdin.on("error", () => {
        // swallow EPIPE: if the process exits before reading stdin, the `close`
        // handler still settles with the exit code.
      });
      child.stdin.end(stdin);
    });
}
