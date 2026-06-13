import type { z } from "zod";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  type: "text" | "reasoning";
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
  /** DeepSeek think mode — 仅 openai-compat provider 生效 */
  thinking?: { type: "enabled" | "disabled" };
}

export interface StructuredParams {
  messages: ChatMessage[];
  schema: z.ZodType<unknown>;
  temperature?: number;
  /** DeepSeek think mode — 仅 openai-compat provider 生效 */
  thinking?: { type: "enabled" | "disabled" };
}

export interface StreamingCallback {
  (chunk: StreamChunk): void;
}

export interface LLMProvider {
  streamChat(params: ChatParams, onChunk: StreamingCallback): Promise<string>;
  generateStructured<T>(params: StructuredParams): Promise<T>;
}
