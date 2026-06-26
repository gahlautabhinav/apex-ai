import { createServer, type Server } from "node:http";
import type { LlmClient } from "@apex/ai-thinkscript";
import { handleGenerate } from "./handler";
import type { RateLimiter } from "./rate-limit";

export interface AppDeps {
  client: LlmClient;
  limiter: RateLimiter;
  html: string;
}

const MAX_BODY = 100_000; // 100 KB

export function createApp(deps: AppDeps): Server {
  return createServer((req, res) => {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(deps.html);
      return;
    }

    if (req.method === "POST" && req.url === "/api/generate") {
      const key = req.socket.remoteAddress ?? "unknown";
      if (!deps.limiter.check(key)) {
        res.writeHead(429, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "rate limited — try again shortly" }));
        return;
      }

      let body = "";
      let aborted = false;
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
        if (body.length > MAX_BODY && !aborted) {
          aborted = true;
          res.writeHead(413, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "request too large" }));
          req.destroy();
        }
      });
      req.on("end", () => {
        if (aborted) return;
        handleGenerate(body, deps.client)
          .then(({ status, body: out }) => {
            res.writeHead(status, { "content-type": "application/json" });
            res.end(JSON.stringify(out));
          })
          .catch((err: Error) => {
            res.writeHead(502, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: `generation failed: ${err.message}` }));
          });
      });
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
}
