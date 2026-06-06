import { describe, expect, it } from "vitest";
import { createDefaultModule, createEmptyResume, type Resume } from "@resumate/shared";
import { AgentRunner, type Plan } from "./runner";
import { ToolRegistry } from "./tool-registry";
import type { LLMProvider, ChatMessage, StructuredParams } from "./llm";

class MockProvider implements LLMProvider {
  constructor(private resume: Resume = createEmptyResume("generated")) {}

  async streamChat(
    _params: { messages: ChatMessage[]; temperature?: number },
    onChunk: (chunk: string) => void,
  ) {
    onChunk("已掌握 JD，继续生成。");
    return "已掌握 JD，继续生成。";
  }

  async generateStructured<T>(_params: StructuredParams): Promise<T> {
    return this.resume as T;
  }
}

describe("AgentRunner", () => {
  it("emits plan:error when a dependency is missing", async () => {
    const runner = new AgentRunner(new MockProvider(), new ToolRegistry());
    const events = await collect(
      runner.execute({
        id: "bad-plan",
        steps: [{ id: "generate", type: "structured", dependsOn: ["collect"] }],
      }),
    );

    expect(events.at(-1)).toMatchObject({
      type: "plan:error",
      stepId: "generate",
    });
  });

  it("emits chat chunk and done events", async () => {
    const runner = new AgentRunner(new MockProvider(), new ToolRegistry());
    const events = await collect(
      runner.execute({
        id: "chat-plan",
        steps: [{ id: "collect", type: "chat" }],
      }),
    );

    expect(events).toContainEqual({
      type: "step:chunk",
      stepId: "collect",
      text: "已掌握 JD，继续生成。",
    });
    expect(events).toContainEqual({
      type: "step:done",
      stepId: "collect",
      result: { text: "已掌握 JD，继续生成。" },
    });
  });

  it("passes structured output into compose", async () => {
    const resume = createEmptyResume("resume-1");
    resume.modules.push(createDefaultModule("header", 0, "header"));

    const registry = new ToolRegistry();
    registry.register("validateResume", async (args) => ({
      valid: Boolean(args.resume),
      issues: [],
    }));

    const plan: Plan = {
      id: "generate-plan",
      steps: [
        { id: "generate", type: "structured", schema: {} as never },
        {
          id: "validate",
          type: "tool",
          dependsOn: ["generate"],
          tool: "validateResume",
          toolArgs: ({ stepResults }) => ({ resume: stepResults.generate }),
        },
        {
          id: "present",
          type: "compose",
          dependsOn: ["validate"],
          compose: ({ stepResults }) => stepResults.generate as Resume,
        },
      ],
    };

    const events = await collect(new AgentRunner(new MockProvider(resume), registry).execute(plan));

    expect(events.at(-1)).toEqual({ type: "plan:done", resume });
  });
});

async function collect<T>(generator: AsyncGenerator<T>) {
  const events: T[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}
