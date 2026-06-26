import { LlmClient, LlmRequest } from "./llm-client";

// Testing/dev double for LlmClient. Returns scripted responses in order and
// repeats the last one once exhausted, so a self-correction loop that keeps
// failing terminates on a stable response. Records every request in `calls`.
export class FakeLlmClient implements LlmClient {
  readonly calls: LlmRequest[] = [];
  private index = 0;

  constructor(private readonly responses: string[]) {
    if (responses.length === 0) {
      throw new Error("FakeLlmClient requires at least one response");
    }
  }

  async complete(req: LlmRequest): Promise<string> {
    this.calls.push(req);
    const i = Math.min(this.index, this.responses.length - 1);
    this.index++;
    return this.responses[i];
  }
}
