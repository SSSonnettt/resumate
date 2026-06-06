import { Anthropic } from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { LLMProvider, ChatMessage } from "./types";

/** 从 content blocks 中提取第一个文本块 */
function extractText(
  blocks: Array<{ type: string; text?: string }>,
): string {
  if (!blocks || blocks.length === 0) {
    throw new Error("AI 返回了空响应，请检查 API Key 是否正确");
  }

  const textBlock = blocks.find((b) => b.type === "text");
  if (!textBlock) {
    const types = blocks.map((b) => b.type).join(", ");
    throw new Error(`AI 返回了非预期的内容类型: ${types}，请重试`);
  }

  const text = textBlock.text;
  if (!text || text.trim().length === 0) {
    throw new Error("AI 返回了空文本，请重试");
  }

  return text;
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "",
    });
    this.model = model || "claude-sonnet-4-20250514";
  }

  async streamChat(
    params: { messages: ChatMessage[]; temperature?: number },
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    let full = "";
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: params.temperature ?? 0.7,
      system: params.messages.find((m) => m.role === "system")?.content,
      messages: params.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
    }
    return full;
  }

  async generateStructured<T>(params: {
    messages: ChatMessage[];
    schema: z.ZodType<unknown>;
    temperature?: number;
  }): Promise<T> {
    // 将 Zod schema 转换为标准 JSON Schema
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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: params.temperature ?? 0.2,
      system:
        "You are a JSON-only API. Always respond with valid JSON matching the provided schema. No other text.",
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = extractText(
      response.content as Array<{ type: string; text?: string }>,
    );

    // 提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `AI 返回的内容不包含 JSON，请重试。内容前200字符: ${text.slice(0, 200)}`,
      );
    }

    return JSON.parse(jsonMatch[0]) as unknown as T;
  }
}
