import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { LLMProvider, ChatMessage } from "./types";

export interface OpenAICompatConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

/**
 * OpenAI 兼容 Provider — 支持 DeepSeek、OpenAI、及其他兼容 Chat Completions API 的服务。
 * 使用原生 fetch，不依赖任何 SDK。
 */
export class OpenAICompatProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: OpenAICompatConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL.replace(/\/$/, "");
    this.model = config.model;
  }

  async streamChat(
    params: { messages: ChatMessage[]; temperature?: number },
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.temperature ?? 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `${response.status} ${response.statusText}${errorBody ? ` — ${errorBody}` : ""}`,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    let fullText = "";
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (typeof content === "string") {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }

    return fullText;
  }

  async generateStructured<T>(params: {
    messages: ChatMessage[];
    schema: z.ZodType<unknown>;
    temperature?: number;
  }): Promise<T> {
    const jsonSchema = zodToJsonSchema(params.schema, {
      $refStrategy: "none",
    });
    const schemaStr = JSON.stringify(jsonSchema, null, 2);

    const messages = [
      ...params.messages,
      {
        role: "assistant" as const,
        content:
          "I will respond with valid JSON only, following this schema:\n```json\n" +
          schemaStr +
          "\n```",
      },
    ];

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: params.temperature ?? 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `${response.status} ${response.statusText}${errorBody ? ` — ${errorBody}` : ""}`,
      );
    }

    const data = await response.json();
    const text =
      data.choices?.[0]?.message?.content ?? "";

    if (!text || text.trim().length === 0) {
      throw new Error("AI 返回了空响应，请检查 API Key 和模型配置");
    }

    // 提取 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `AI 返回的内容不包含 JSON，请重试。内容前200字符: ${text.slice(0, 200)}`,
      );
    }

    return JSON.parse(jsonMatch[0]) as unknown as T;
  }
}
