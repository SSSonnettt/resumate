import type { LLMProvider } from "./llm";
import type { HarnessEvent } from "@ai-resume/shared";
import { ToolRegistry } from "./tool-registry";
import type { z } from "zod";

export interface PlanStep {
  id: string;
  type: "tool" | "chat" | "structured" | "compose";
  dependsOn?: string[];
  tool?: string;
  toolArgs?: Record<string, unknown>;
  systemPrompt?: string;
  userPromptTemplate?: string;
  schema?: z.ZodType<unknown>;
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
    context: Record<string, unknown> = {}
  ): AsyncGenerator<HarnessEvent> {
    yield { type: "plan:start", planId: plan.id };

    const stepResults = new Map<string, unknown>();

    for (const step of plan.steps) {
      // Check dependencies
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!stepResults.has(dep)) {
            yield {
              type: "plan:error",
              stepId: step.id,
              error: `依赖步骤 ${dep} 未完成`,
            };
            return;
          }
        }
      }

      yield {
        type: "step:start",
        stepId: step.id,
        description: `执行: ${step.id}`,
      };

      try {
        switch (step.type) {
          case "tool": {
            yield {
              type: "step:tool_call",
              stepId: step.id,
              tool: step.tool!,
              args: step.toolArgs || {},
            };
            const result = await this.registry.execute(
              step.tool!,
              step.toolArgs || {}
            );
            stepResults.set(step.id, result);
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "chat": {
            const systemMsg = step.systemPrompt || "You are a helpful career advisor.";
            let fullText = "";
            const messages = [
              { role: "system" as const, content: systemMsg },
              { role: "user" as const, content: step.userPromptTemplate || "Let's begin." },
            ];

            await this.provider.streamChat({ messages }, (chunk) => {
              fullText += chunk;
            });
            stepResults.set(step.id, { text: fullText });
            yield { type: "step:done", stepId: step.id, result: { text: fullText } };
            break;
          }

          case "structured": {
            const schema = step.schema!;
            const messages = [
              { role: "system" as const, content: step.systemPrompt || "Generate the resume content." },
              { role: "user" as const, content: step.userPromptTemplate || JSON.stringify(context) },
            ];

            const result = await this.provider.generateStructured({
              messages,
              schema,
            });
            stepResults.set(step.id, result);
            yield { type: "step:done", stepId: step.id, result };
            break;
          }

          case "compose": {
            const allResults: Record<string, unknown> = {};
            for (const [key, value] of stepResults) {
              allResults[key] = value;
            }
            yield {
              type: "plan:done",
              resume: (context.resume || allResults) as unknown as never,
            } as HarnessEvent;
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
