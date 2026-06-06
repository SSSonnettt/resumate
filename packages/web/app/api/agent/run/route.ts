import { NextRequest } from "next/server";
import {
  AgentRunner,
  AnthropicProvider,
  OpenAICompatProvider,
  createBuiltInTools,
} from "@resumate/agent-harness";
import type { LLMProvider } from "@resumate/agent-harness";
import type { Plan } from "@resumate/agent-harness";
import {
  normalizeResumeOrder,
  resumeSchema,
  type HarnessEvent,
} from "@resumate/shared";
import { z } from "zod";

const runRequestSchema = z.object({
  provider: z.enum(["anthropic", "openai-compat"]).default("anthropic"),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }),
  ),
});

const systemPrompt = [
  "你是一个面向中文求职者的 AI 简历工作台。",
  "你的任务是根据用户提供的目标岗位 JD 和个人经历，生成一份完整、可直接投递的中文简历。",
  "简历必须具体、职业化，优先突出与 JD 匹配的经历、技能和项目。",
  "如果用户未提供具体细节（如公司名、学校名、时间等），可以基于 JD 合理推断补全，生成可信的示例内容——",
  "例如根据 JD 中的技术栈推断相关项目经验，根据岗位要求推断可能的工作经历。",
  "不要留空模块，每个模块都要填充合理的示例数据，确保简历看起来完整专业。",
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
          "你是中文求职简历向导。用户的 JD 已经提供，个人经历可能不完整。你的任务很简短：总结已有的关键信息（一两句话），然后直接告诉用户'信息已足够，现在为你生成一份完整的简历'。不要追问缺失信息，后续会基于 JD 合理补全。",
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
          "请基于以下对话生成一份完整的中文简历 JSON。",
          "核心要求：",
          "1. 所有模块必须填充完整内容，不允许留空或使用空字符串/空数组",
          "2. 用户未提供的细节（公司名、学校名、项目名、时间等），基于 JD 合理推断补全，生成可信的示例",
          "3. 例如：JD 提到'桌面运维'和'ITSM'，就应生成相关工作经历和项目，描述要具体、结果导向",
          "4. header/summary/work-experience/skills 为必填模块，education/projects 建议也生成",
          "5. 每个模块的 id 为稳定字符串；order 从 0 开始递增；visible 为 true",
          "6. summary 需体现与目标岗位的匹配度",
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

  const { messages, apiKey, provider, baseURL, model } = parsed.data;
  const llmProvider = createLLMProvider({ provider, apiKey, baseURL, model });
  const registry = createBuiltInTools();
  const runner = new AgentRunner(llmProvider, registry);

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

function createLLMProvider(config: {
  provider: "anthropic" | "openai-compat";
  apiKey?: string;
  baseURL?: string;
  model?: string;
}): LLMProvider {
  if (config.provider === "openai-compat") {
    return new OpenAICompatProvider({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
      baseURL: config.baseURL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: config.model || process.env.OPENAI_MODEL || "gpt-4o",
    });
  }
  return new AnthropicProvider(config.apiKey || undefined);
}
