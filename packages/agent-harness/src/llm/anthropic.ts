import { Anthropic } from "@anthropic-ai/sdk";
import type { LLMProvider, ChatMessage } from "./types";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "",
    });
  }

  async streamChat(
    params: { messages: ChatMessage[]; temperature?: number },
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let full = "";
    const stream = await this.client.messages.create({
      model: "claude-sonnet-4-6",
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
    schema: { _type: unknown };
    temperature?: number;
  }): Promise<T> {
    const schemaStr = JSON.stringify(params.schema, null, 2);
    const messages = [
      ...params.messages,
      {
        role: "assistant" as const,
        content:
          'I will respond with valid JSON only, following this schema:\n```json\n' +
          schemaStr +
          "\n```",
      },
    ];

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: params.temperature ?? 0.2,
      system: "You are a JSON-only API. Always respond with valid JSON matching the provided schema. No other text.",
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text = (response.content[0] as { text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    return json as T;
  }
}
