import { NextRequest } from "next/server";
import {
  AgentRunner,
  AnthropicProvider,
  createBuiltInTools,
} from "@ai-resume/agent-harness";
import type { Plan } from "@ai-resume/agent-harness";
import type { Resume, HarnessEvent } from "@ai-resume/shared";
import { z } from "zod";

const ResumeModuleSchema = z.object({
  id: z.string(),
  type: z.enum([
    "header",
    "summary",
    "work-experience",
    "education",
    "skills",
    "projects",
    "custom",
  ]),
  order: z.number(),
  visible: z.boolean(),
  data: z.record(z.unknown()),
});

const ResumeSchema = z.object({
  id: z.string(),
  modules: z.array(ResumeModuleSchema),
  theme: z.object({
    templateId: z.string(),
    primaryColor: z.string(),
    fontFamily: z.enum(["sans", "serif", "kai"]),
    fontSize: z.enum(["small", "medium", "large"]),
    spacing: z.enum(["compact", "normal", "loose"]),
  }),
});

const resumeGenerationPlan: Plan = {
  id: "resume-generation",
  steps: [
    { id: "classify", type: "tool", tool: "classifyIntent", toolArgs: {} },
    {
      id: "collect",
      type: "chat",
      dependsOn: ["classify"],
      systemPrompt:
        "你是一位专业的职业顾问。引导用户逐步提供简历所需信息：姓名和联系方式、工作经历、教育背景、技能、项目经历。每次只问一个模块，用户跳过也无妨。回答要简洁，每次只问一个问题。",
      userPromptTemplate: "",
    },
    {
      id: "generate",
      type: "structured",
      dependsOn: ["collect"],
      schema: ResumeSchema,
      systemPrompt:
        "根据之前收集到的用户信息，生成完整的简历 JSON。严格遵循提供的 Schema。如果没有足够信息，用合理的默认值填充。",
      userPromptTemplate: "",
    },
    {
      id: "validate",
      type: "tool",
      dependsOn: ["generate"],
      tool: "validateResume",
      toolArgs: {},
    },
    { id: "present", type: "compose", dependsOn: ["validate"], toolArgs: {} },
  ],
};

export async function POST(request: NextRequest) {
  const { messages, apiKey } = await request.json();

  const provider = new AnthropicProvider(apiKey || undefined);
  const registry = createBuiltInTools();
  const runner = new AgentRunner(provider, registry);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const plan = { ...resumeGenerationPlan };
        const lastMsg = messages?.[messages.length - 1]?.content || "";
        plan.steps[0]!.toolArgs = { input: lastMsg };
        plan.steps[1]!.userPromptTemplate = JSON.stringify(messages);

        // 收集步骤结果以便在 present 时提取 resume
        const stepResults: Record<string, unknown> = {};

        for await (const rawEvent of runner.execute(plan, { messages })) {
          let event = rawEvent;

          // 记录每个步骤的结果
          if (
            rawEvent.type === "step:done" &&
            rawEvent.result
          ) {
            stepResults[rawEvent.stepId] = rawEvent.result;
          }

          // compose 步骤：从 generate 步骤的结果中提取真正的 Resume
          if (rawEvent.type === "plan:done") {
            const generated = stepResults["generate"] as Resume | undefined;
            if (generated && generated.modules && generated.theme) {
              event = {
                type: "plan:done",
                resume: generated,
              };
            }
          }

          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        const done = `data: ${JSON.stringify({ type: "stream:done" })}\n\n`;
        controller.enqueue(encoder.encode(done));
        controller.close();
      } catch (err) {
        const error = `data: ${JSON.stringify({
          type: "stream:error",
          error: String(err),
        })}\n\n`;
        controller.enqueue(encoder.encode(error));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
