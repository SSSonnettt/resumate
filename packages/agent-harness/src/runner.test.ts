import { describe, expect, it } from "vitest";
import { createEmptyResume, type Resume } from "@resumate/shared";
import { AgentRunner, type Plan } from "./runner";
import { ToolRegistry } from "./tool-registry";
import type { LLMProvider, ChatParams, StructuredParams, StreamChunk } from "./llm";
import { HookManager } from "./hooks";
import { summarizeConversation, estimateTokens } from "./context";

class MockProvider implements LLMProvider {
  constructor(private resume: Resume = createEmptyResume("generated")) {}

  async streamChat(
    _params: ChatParams,
    onChunk: (chunk: StreamChunk) => void,
  ) {
    onChunk({ type: "text", content: "已掌握 JD，继续生成。" });
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
    resume.data.basics = { name: "test" };

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

  it("skips step when condition is false", async () => {
    const runner = new AgentRunner(new MockProvider(), new ToolRegistry());
    const plan: Plan = {
      id: "condition-test",
      steps: [
        { id: "always", type: "chat" },
        {
          id: "conditional",
          type: "chat",
          dependsOn: ["always"],
          condition: () => false,
        },
      ],
    };
    const events = await collect(runner.execute(plan));
    expect(events).toContainEqual(
      expect.objectContaining({ type: "step:skipped", stepId: "conditional" }),
    );
  });

  it("stops execution when hook blocks beforeStep", async () => {
    const hooks = new HookManager();
    hooks.register({
      point: "beforeStep",
      priority: 1,
      name: "testBlocker",
      handler: async (ctx) => {
        if (ctx.stepId === "blocked-step") {
          return { action: "block", reason: "测试阻断" };
        }
        return { action: "continue" };
      },
    });

    const runner = new AgentRunner(new MockProvider(), new ToolRegistry(), hooks);
    const plan: Plan = {
      id: "hook-block-test",
      steps: [
        { id: "ok-step", type: "chat" },
        { id: "blocked-step", type: "chat", dependsOn: ["ok-step"] },
      ],
    };
    const events = await collect(runner.execute(plan));
    expect(events).toContainEqual(
      expect.objectContaining({ type: "hook:block", stepId: "blocked-step" }),
    );
    // 确保 blocked-step 没有执行
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: "step:done", stepId: "blocked-step" }),
    );
  });

  it("retries structured step on parse failure", async () => {
    let callCount = 0;
    const provider: LLMProvider = {
      async streamChat(params, onChunk) {
        onChunk({ type: "text", content: "ok" });
        return "ok";
      },
      async generateStructured<T>(): Promise<T> {
        callCount++;
        if (callCount === 1) {
          throw new Error("JSON parse failed");
        }
        return { success: true } as T;
      },
    };

    const runner = new AgentRunner(provider, new ToolRegistry());
    const plan: Plan = {
      id: "retry-test",
      steps: [
        { id: "gen", type: "structured", schema: {} as never, maxRetries: 2 },
      ],
    };
    const events = await collect(runner.execute(plan));
    expect(events).toContainEqual(
      expect.objectContaining({ type: "step:retry", stepId: "gen", attempt: 1 }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({ type: "step:done", stepId: "gen" }),
    );
  });

  it("jumps to onFail target step on failure", async () => {
    const registry = new ToolRegistry();
    registry.register("failingTool", async () => { throw new Error("工具失败"); });
    registry.register("fallbackTool", async () => ({ recovered: true }));

    const runner = new AgentRunner(new MockProvider(), registry);
    const plan: Plan = {
      id: "onfail-test",
      steps: [
        { id: "risky", type: "tool", tool: "failingTool", onFail: ["fallback"] },
        { id: "unreachable", type: "chat" },
        { id: "fallback", type: "tool", tool: "fallbackTool" },
      ],
    };
    const events = await collect(runner.execute(plan));
    // fallback 应该执行了
    expect(events).toContainEqual(
      expect.objectContaining({ type: "step:done", stepId: "fallback" }),
    );
    // unreachable 不应该执行（因为直接跳到了 fallback）
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: "step:start", stepId: "unreachable" }),
    );
  });

  it("stops onFail loop after max jumps", async () => {
    const registry = new ToolRegistry();
    registry.register("failingTool", async () => { throw new Error("持续失败"); });

    // fallbackTool 也必须失败才能形成循环：
    // risky(失败) → fallback(失败) → risky(失败) → fallback(失败) → ... → 超限中止
    registry.register("fallbackTool", async () => { throw new Error("备选也失败"); });

    const runner = new AgentRunner(new MockProvider(), registry);
    const plan: Plan = {
      id: "loop-test",
      steps: [
        { id: "risky", type: "tool", tool: "failingTool", onFail: ["fallback"] },
        { id: "fallback", type: "tool", tool: "fallbackTool", onFail: ["risky"] },
        { id: "final", type: "chat" },
      ],
    };
    const events = await collect(runner.execute(plan));
    // 应该因为循环超限而中止，不会到达 final
    expect(events).toContainEqual(
      expect.objectContaining({ type: "plan:error" }),
    );
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: "step:done", stepId: "final" }),
    );
  });
});

describe("Context utilities", () => {
  it("summarizeConversation includes collected info and recent messages", () => {
    const messages = [
      { role: "user" as const, content: "我叫张三" },
      { role: "assistant" as const, content: "你好张三" },
      { role: "user" as const, content: "我有5年经验" },
      { role: "assistant" as const, content: "好的" },
    ];
    const info = { name: "张三", experience: "5年" };
    const result = summarizeConversation(messages, info, 2);
    expect(result).toContain("张三");
    expect(result).toContain("已收集的信息");
    expect(result).toContain("最近对话");
  });

  it("estimateTokens returns reasonable values", () => {
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
    expect(estimateTokens("你好世界")).toBe(4); // 4 个中文字符
    expect(estimateTokens("")).toBe(0);
  });
});

async function collect<T>(generator: AsyncGenerator<T>) {
  const events: T[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}
