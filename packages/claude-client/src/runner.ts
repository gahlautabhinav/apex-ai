import { spawn } from "node:child_process";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommandRunner = (args: string[], stdin: string) => Promise<CommandResult>;

// Default runner: spawns the real `claude` binary (a native executable on
// PATH; shell:false is correct on Windows too) and writes `stdin` to it.
// Inherits the parent env, so the existing Claude Code login is used.
export function spawnRunner(command = "claude"): CommandRunner {
  return (args, stdin) =>
    new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      child.once("error", reject);
      child.once("close", (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
      child.stdin.on("error", () => {
        // swallow EPIPE: if the process exits before reading stdin, the `close`
        // handler still fires with the exit code and complete() throws cleanly.
      });
      child.stdin.end(stdin);
    });
}
