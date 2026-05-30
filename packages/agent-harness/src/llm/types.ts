import type { z } from "zod";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  temperature?: number;
}

export interface StructuredParams {
  messages: ChatMessage[];
  schema: z.ZodType<unknown>;
  temperature?: number;
}

export interface StreamingCallback {
  (chunk: string): void;
}

export interface LLMProvider {
  streamChat(params: ChatParams, onChunk: StreamingCallback): Promise<string>;
  generateStructured<T>(params: StructuredParams): Promise<T>;
}
