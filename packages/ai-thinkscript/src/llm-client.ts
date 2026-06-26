export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  model: string;
  maxTokens?: number;
}

export interface LlmClient {
  complete(req: LlmRequest): Promise<string>;
}
