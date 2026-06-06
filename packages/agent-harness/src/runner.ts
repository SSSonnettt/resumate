import type { Resume, HarnessEvent } from "@resumate/shared";
import type { z } from "zod";
import type { LLMProvider, ChatMessage } from "./llm";
import { ToolRegistry } from "./tool-registry";

export interface StepRuntime {
  context: Record<string, unknown>;
  stepResults: Record<string, unknown>;
}

export type RuntimeValue<T> = T | ((runtime: StepRuntime) => T);

export interface PlanStep {
  id: string;
  type: "tool" | "chat" | "structured" | "compose";
  description?: string;
  dependsOn?: string[];
  tool?: string;
  toolArgs?: RuntimeValue<Record<string, unknown>>;
  systemPrompt?: RuntimeValue<string>;
  userPromptTemplate?: RuntimeValue<string>;
  schema?: z.ZodType<unknown>;
  compose?: RuntimeValue<Resume>;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
}

export class AgentRunner {
  private registry: ToolRegistry;
  private provider: LLMProvider;

  constructor(provider: LLMProvider, registry: ToolRegistry) {
    this.provider = provider;
    this.registry = registry;
  }

  async *execute(
    plan: Plan,
    context: Record<string, unknown> = {},
  ): AsyncGenerator<HarnessEvent> {
    yield { type: "plan:start", planId: plan.id };

    const stepResults: Record<string, unknown> = {};

    for (const step of plan.steps) {
      const missingDep = step.dependsOn?.find((dep) => !(dep in stepResults));
      if (missingDep) {
        yield {
          type: "plan:error",
          stepId: step.id,
          error: `依赖步骤 ${missingDep} 未完成`,
        };
        return;
      }

      yield {
        type: "step:start",
        stepId: step.id,
        description: step.description ?? `执行: ${step.id}`,
      };

      const runtime = { context, stepResults };

      try {
        switch (step.type) {
          case "tool": {
            if (!step.tool) {
              throw new Error(`步骤 ${step.id} 缺少 tool`);
            }
            const args = resolveRuntimeValue(step.toolArgs, runtime) ?? {};
            yield {
              type: "step:tool_call",
              stepId: step.id,
              tool: step.tool,
              args,
            };

            const result = await this.registry.execute(step.tool, args);
            stepResults[step.id] = result;
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "chat": {
            let fullText = "";
            const messages = createMessages(step, runtime, {
              fallbackSystem: "你是一位专业的中文求职顾问。",
              fallbackUser: "请继续。",
            });

            await this.provider.streamChat({ messages }, (chunk) => {
              fullText += chunk;
            });

            // Provider callbacks are sync-only, so emit the aggregated chunk once.
            if (fullText) {
              yield { type: "step:chunk", stepId: step.id, text: fullText };
            }

            const result = { text: fullText };
            stepResults[step.id] = result;
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "structured": {
            if (!step.schema) {
              throw new Error(`步骤 ${step.id} 缺少 schema`);
            }
            const messages = createMessages(step, runtime, {
              fallbackSystem: "根据用户信息生成结构化简历 JSON。",
              fallbackUser: JSON.stringify(context),
            });

            const result = await this.provider.generateStructured({
              messages,
              schema: step.schema,
            });
            stepResults[step.id] = result;
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "compose": {
            const resume =
              resolveRuntimeValue(step.compose, runtime) ??
              (stepResults.generate as Resume | undefined) ??
              (context.resume as Resume | undefined);

            if (!resume) {
              throw new Error("没有可输出的简历结果");
            }

            stepResults[step.id] = resume;
            yield { type: "step:done", stepId: step.id, result: resume };
            yield { type: "plan:done", resume };
            break;
          }
        }
      } catch (err) {
        yield {
          type: "plan:error",
          stepId: step.id,
          error: err instanceof Error ? err.message : String(err),
        };
        return;
      }
    }
  }
}

function createMessages(
  step: PlanStep,
  runtime: StepRuntime,
  fallback: { fallbackSystem: string; fallbackUser: string },
): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        resolveRuntimeValue(step.systemPrompt, runtime) ??
        fallback.fallbackSystem,
    },
    {
      role: "user",
      content:
        resolveRuntimeValue(step.userPromptTemplate, runtime) ??
        fallback.fallbackUser,
    },
  ];
}

function resolveRuntimeValue<T>(
  value: RuntimeValue<T> | undefined,
  runtime: StepRuntime,
): T | undefined {
  return typeof value === "function"
    ? (value as (runtime: StepRuntime) => T)(runtime)
    : value;
}
