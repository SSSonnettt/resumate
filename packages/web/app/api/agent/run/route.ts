import { NextRequest } from "next/server";
import {
  AgentRunner,
  AnthropicProvider,
  createBuiltInTools,
} from "@resumate/agent-harness";
import type { Plan } from "@resumate/agent-harness";
import {
  normalizeResumeOrder,
  resumeSchema,
  type HarnessEvent,
} from "@resumate/shared";
import { z } from "zod";

const runRequestSchema = z.object({
  apiKey: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

const systemPrompt = [
  "你是一个面向中文求职者的 AI 简历工作台。",
  "你的任务是根据用户提供的目标岗位 JD 和个人经历，生成一份可直接投递的中文简历。",
  "简历必须具体、克制、职业化，优先突出与 JD 匹配的经历、技能和项目。",
  "不要编造公司、学校、证书、时间等关键事实；信息不足时使用空字符串或空数组。",
  "输出必须严格符合 JSON Schema。",
].join("\n");

function createResumeGenerationPlan(messages: Array<{ role: string; content: string }>): Plan {
  const lastMessage = messages.at(-1)?.content ?? "";
  const userContext = JSON.stringify(messages, null, 2);

  return {
    id: "jd-tailored-resume-generation",
    steps: [
      {
        id: "classify",
        type: "tool",
        description: "识别用户当前输入意图",
        tool: "classifyIntent",
        toolArgs: { input: lastMessage },
      },
      {
        id: "collect",
        type: "chat",
        description: "整理已收集信息并提示下一步",
        dependsOn: ["classify"],
        systemPrompt:
          "你是中文求职简历向导。根据对话判断是否已具备 JD、基础信息、工作经历、教育背景、技能、项目经历。回答必须简短：先说明已掌握什么，再只问一个最关键的缺失问题。如果信息已足够，告诉用户将生成定制简历。",
        userPromptTemplate: userContext,
      },
      {
        id: "generate",
        type: "structured",
        description: "生成岗位定制中文简历",
        dependsOn: ["collect"],
        schema: resumeSchema,
        systemPrompt,
        userPromptTemplate: [
          "请基于以下对话生成一份中文简历 JSON。",
          "模块建议顺序：header、summary、work-experience、projects、skills、education，可按信息完整度省略空模块之外的模块。",
          "summary 要体现目标岗位匹配度；work-experience/project 描述使用结果导向的中文表达。",
          "每个模块的 id 必须为稳定字符串；order 从 0 开始递增；visible 为 true。",
          userContext,
        ].join("\n\n"),
      },
      {
        id: "validate",
        type: "tool",
        description: "校验简历结构",
        dependsOn: ["generate"],
        tool: "validateResume",
        toolArgs: ({ stepResults }) => ({
          resume: stepResults.generate,
        }),
      },
      {
        id: "present",
        type: "compose",
        description: "输出最终简历",
        dependsOn: ["validate"],
        compose: ({ stepResults }) =>
          normalizeResumeOrder(resumeSchema.parse(stepResults.generate)),
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  const parsed = runRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "请求格式不正确", details: parsed.error.flatten() }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { messages, apiKey } = parsed.data;
  const provider = new AnthropicProvider(apiKey || undefined);
  const registry = createBuiltInTools();
  const runner = new AgentRunner(provider, registry);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const plan = createResumeGenerationPlan(messages);

        for await (const event of runner.execute(plan, { messages })) {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        }

        controller.enqueue(encoder.encode(encodeSSE({ type: "stream:done" })));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            encodeSSE({
              type: "stream:error",
              error: err instanceof Error ? err.message : String(err),
            }),
          ),
        );
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

function encodeSSE(event: HarnessEvent | { type: "stream:done" } | { type: "stream:error"; error: string }) {
  return `data: ${JSON.stringify(event)}\n\n`;
}
