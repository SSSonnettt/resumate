import type { Resume, HarnessEvent } from "@resumate/shared";
import type { z } from "zod";
import type { LLMProvider, ChatMessage, StreamChunk } from "./llm";
import type { HookManager } from "./hooks";
import { ToolRegistry } from "./tool-registry";
import { AsyncStreamQueue } from "./async-stream-queue";

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
  condition?: RuntimeValue<boolean>;
  onFail?: string[];
  maxRetries?: number;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
}

export class AgentRunner {
  private registry: ToolRegistry;
  private provider: LLMProvider;
  private hooks?: HookManager;

  /** 单次 onFail 跳转最大次数，防止无限循环 */
  private static readonly MAX_ONFAIL_JUMPS = 3;

  constructor(provider: LLMProvider, registry: ToolRegistry, hooks?: HookManager) {
    this.provider = provider;
    this.registry = registry;
    this.hooks = hooks;
  }

  async *execute(
    plan: Plan,
    context: Record<string, unknown> = {},
  ): AsyncGenerator<HarnessEvent> {
    yield { type: "plan:start", planId: plan.id };

    // beforePlan hook
    if (this.hooks) {
      const result = await this.hooks.executeHooks("beforePlan", { planId: plan.id });
      if (result.action === "block") {
        yield { type: "hook:block", hookName: "beforePlan", reason: result.reason };
        return;
      }
    }

    const stepResults: Record<string, unknown> = {};
    const steps = plan.steps;
    /** 记录每个步骤通过 onFail 跳转的次数，防止无限循环 */
    const stepExecutionCount = new Map<string, number>();

    let i = 0;
    while (i < steps.length) {
      const step = steps[i];

      // 依赖检查
      const missingDep = step.dependsOn?.find((dep) => !(dep in stepResults));
      if (missingDep) {
        yield {
          type: "plan:error",
          stepId: step.id,
          error: `依赖步骤 ${missingDep} 未完成`,
        };
        return;
      }

      const runtime = { context, stepResults };

      // condition 检查
      const shouldRun = resolveRuntimeValue(step.condition, runtime) ?? true;
      if (!shouldRun) {
        stepResults[step.id] = { skipped: true };
        yield { type: "step:skipped", stepId: step.id, reason: "条件不满足，跳过" };
        i++;
        continue;
      }

      // beforeStep hook
      if (this.hooks) {
        const hookResult = await this.hooks.executeHooks("beforeStep", {
          planId: plan.id,
          stepId: step.id,
          stepType: step.type,
          stepResults,
        });
        if (hookResult.action === "block") {
          yield {
            type: "hook:block",
            hookName: "beforeStep",
            stepId: step.id,
            reason: hookResult.reason,
          };
          return;
        }
      }

      yield {
        type: "step:start",
        stepId: step.id,
        description: step.description ?? `执行: ${step.id}`,
      };

      // 递增执行计数（用于循环防护）
      const execCount = (stepExecutionCount.get(step.id) ?? 0) + 1;
      stepExecutionCount.set(step.id, execCount);

      const startTime = Date.now();

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
            let fullReasoning = "";
            const messages = createMessages(step, runtime, {
              fallbackSystem: "你是一位专业的中文求职顾问。",
              fallbackUser: "请继续。",
            });

            // 使用 AsyncStreamQueue 桥接回调 → async iterator，实现逐 chunk 实时 yield
            const queue = new AsyncStreamQueue<StreamChunk>();
            const streamPromise = this.provider
              .streamChat({ messages, thinking: { type: "enabled" } }, (chunk) => {
                queue.push(chunk);
                if (chunk.type === "reasoning") {
                  fullReasoning += chunk.content;
                } else {
                  fullText += chunk.content;
                }
              })
              .then(() => queue.close())
              .catch((err) => queue.setError(err instanceof Error ? err : new Error(String(err))));

            for await (const chunk of queue) {
              if (chunk.type === "reasoning") {
                yield { type: "reasoning:chunk", stepId: step.id, text: chunk.content };
              } else {
                yield { type: "step:chunk", stepId: step.id, text: chunk.content };
              }
            }

            // 等待 streamChat Promise 完成以捕获潜在错误
            await streamPromise;

            const result = { text: fullText, reasoning: fullReasoning || undefined };
            stepResults[step.id] = result;
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "structured": {
            if (!step.schema) {
              throw new Error(`步骤 ${step.id} 缺少 schema`);
            }

            // 发出推理事件，说明当前步骤在做什么
            yield {
              type: "reasoning:chunk",
              stepId: step.id,
              text: `正在根据已收集的信息进行结构化生成 (${step.description || step.id})...`,
            };

            const maxRetries = step.maxRetries ?? 1;
            let lastError: Error | null = null;
            let result: unknown = null;

            for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
              try {
                const messages = createMessages(step, runtime, {
                  fallbackSystem: "根据用户信息生成结构化简历 JSON。",
                  fallbackUser: JSON.stringify(context),
                });

                // 如果是重试，将错误信息追加到 user prompt
                if (lastError && attempt > 1) {
                  messages.push({
                    role: "user",
                    content: `上一次生成的 JSON 有格式错误，请修正：${lastError.message}`,
                  });
                }

                result = await this.provider.generateStructured({
                  messages,
                  schema: step.schema,
                  thinking: { type: "enabled" },
                });
                lastError = null;
                break; // 成功
              } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt <= maxRetries) {
                  yield {
                    type: "step:retry",
                    stepId: step.id,
                    attempt,
                    error: lastError.message,
                  };
                }
              }
            }

            if (lastError) throw lastError;

            // 发出生成内容的文本摘要，让 UI 有内容可展示
            const resultStr =
              typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2);
            yield {
              type: "reasoning:chunk",
              stepId: step.id,
              text: `结构化生成完成，共 ${resultStr.length} 字符。`,
            };
            yield {
              type: "step:chunk",
              stepId: step.id,
              text: resultStr.length > 500
                ? resultStr.slice(0, 500) + `\n... (共 ${resultStr.length} 字符)`
                : resultStr,
            };

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

        // afterStep hook
        if (this.hooks) {
          const duration = Date.now() - startTime;
          const hookResult = await this.hooks.executeHooks("afterStep", {
            planId: plan.id,
            stepId: step.id,
            stepType: step.type,
            stepResult: stepResults[step.id],
            stepResults,
            duration,
          });
          if (hookResult.action === "block") {
            yield {
              type: "hook:block",
              hookName: "afterStep",
              stepId: step.id,
              reason: hookResult.reason,
            };
            return;
          }
        }
      } catch (err) {
        // onFail 跳转逻辑
        if (step.onFail && step.onFail.length > 0) {
          const targetStepId = step.onFail[0];
          const targetIndex = steps.findIndex((s) => s.id === targetStepId);

          // 循环防护：同一目标步骤通过 onFail 跳转最多 MAX_ONFAIL_JUMPS 次
          const targetExecCount = stepExecutionCount.get(targetStepId) ?? 0;
          if (targetIndex >= 0 && targetExecCount < AgentRunner.MAX_ONFAIL_JUMPS) {
            stepResults[step.id] = {
              error: err instanceof Error ? err.message : String(err),
            };
            i = targetIndex;
            continue; // 跳转到目标步骤
          }
        }
        // 没有 onFail 或目标未找到，正常中止
        yield {
          type: "plan:error",
          stepId: step.id,
          error: err instanceof Error ? err.message : String(err),
        };
        return;
      }

      i++;
    }

    // afterPlan hook
    if (this.hooks) {
      await this.hooks.executeHooks("afterPlan", { planId: plan.id, stepResults });
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
