import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ClaudeCliClient } from "@apex/claude-client";
import { createApp } from "./app";
import { fixedWindowLimiter } from "./rate-limit";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "../public/index.html"), "utf8");

const app = createApp({
  client: new ClaudeCliClient(),
  limiter: fixedWindowLimiter(10, 60_000), // 10 generations / minute / IP
  html,
});

const port = Number(process.env.PORT ?? 4317);
app.listen(port, () => {
  console.log(`APEX ThinkScript tool: http://localhost:${port}`);
});
