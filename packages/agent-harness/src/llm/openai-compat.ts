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
    params: { messages: ChatMessage[]; temperature?: number; thinking?: { type: "enabled" | "disabled" } },
    onChunk: (chunk: { type: "text" | "reasoning"; content: string }) => void,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: params.temperature ?? 0.7,
      max_tokens: 4096,
      stream: true,
    };

    // DeepSeek think mode
    if (params.thinking) {
      body.thinking = params.thinking;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
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
          const delta = parsed.choices?.[0]?.delta;

          // 先发送 reasoning_content（思考过程）
          if (typeof delta?.reasoning_content === "string") {
            onChunk({ type: "reasoning", content: delta.reasoning_content });
          }

          // 再发送 content（正式回复）
          if (typeof delta?.content === "string") {
            fullText += delta.content;
            onChunk({ type: "text", content: delta.content });
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
    thinking?: { type: "enabled" | "disabled" };
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

    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: params.temperature ?? 0.2,
      max_tokens: 16384, // 完整简历 JSON 需要较大的 token 预算
      response_format: { type: "json_object" },
    };

    // DeepSeek think mode
    if (params.thinking) {
      body.thinking = params.thinking;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
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

    return parseJSONResponse(text) as unknown as T;
  }
}

/**
 * 从 LLM 响应中解析 JSON，带修复重试。
 * LLM（尤其是 DeepSeek）有时会生成有细微语法错误的 JSON。
 */
function parseJSONResponse(text: string): unknown {
  // 尝试1：直接匹配最外层 JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `AI 返回的内容不包含 JSON 对象。内容前200字符: ${text.slice(0, 200)}`,
    );
  }

  let raw = jsonMatch[0];

  // 尝试2：直接解析
  try {
    return JSON.parse(raw);
  } catch {
    // 继续尝试修复
  }

  // 尝试3：修复常见 JSON 问题
  const repaired = repairJSON(raw);
  try {
    return JSON.parse(repaired);
  } catch (e) {
    const err = e instanceof SyntaxError ? e.message : String(e);
    // 标记错误位置附近的上下文
    const posMatch = err.match(/position (\d+)/);
    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
    const context = raw.slice(Math.max(0, pos - 80), pos + 80);
    throw new Error(
      `AI 返回的 JSON 格式有误，无法修复：${err}\n错误位置附近: ...${context}...`,
    );
  }
}

/**
 * 修复 LLM 常见的 JSON 格式错误：
 * - 数组/对象末尾多余逗号
 * - 缺少引号的 key
 * - 单引号替代双引号
 */
function repairJSON(raw: string): string {
  let repaired = raw;

  // 移除末尾多余逗号（对象和数组中的 trailing comma）
  // 例如: {"a": 1,} → {"a": 1}
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  // 修复缺少逗号的情况：}\n 或 ]\n 后直接跟 "key" 或 {
  // 例如: {"a": 1}\n{"b": 2} → 这种情况不太可能，跳过

  // 修复单引号 key（LLM 偶尔用单引号）
  // 例如: {'key': 'value'} → {"key": "value"}
  // 仅在确认是 key 位置时替换
  repaired = repaired.replace(/'([^']+)'(\s*):/g, '"$1"$2:');

  return repaired;
}
