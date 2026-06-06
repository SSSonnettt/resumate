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
        Accept: "text/event-stream",
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

    // DeepSeek 的 json_object 模式要求 prompt 中必须包含 "json" 关键词。
    // 将 schema 注入到 system prompt 或 user prompt 中（而非 assistant 消息），
    // 以确保 "json" 出现在 DeepSeek 校验的 prompt 范围内。
    const schemaInjection =
      "\n\n你必须严格按照以下 JSON Schema 输出 json 格式的响应，不要包含任何其他文字：\n```json\n" +
      schemaStr +
      "\n```";

    const messages = params.messages.map((m, i) => {
      if (m.role === "system") {
        return { ...m, content: m.content + schemaInjection };
      }
      return m;
    });

    // 如果没有 system 消息，加到第一条 user 消息末尾
    if (!params.messages.some((m) => m.role === "system")) {
      const firstUserIdx = messages.findIndex((m) => m.role === "user");
      if (firstUserIdx >= 0) {
        messages[firstUserIdx] = {
          ...messages[firstUserIdx],
          content: messages[firstUserIdx].content + schemaInjection,
        };
      }
    }

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
