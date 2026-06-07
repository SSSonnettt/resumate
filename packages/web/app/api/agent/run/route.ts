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
        type: "tool" as const,
        description: "识别用户当前输入意图",
        tool: "classifyIntent",
        toolArgs: { input: lastMessage },
      },
      {
        id: "analyze-jd",
        type: "chat" as const,
        description: "深度分析岗位 JD",
        dependsOn: ["classify"],
        systemPrompt: [
          "你是 JD 分析专家。从岗位描述中提取关键信息，输出简洁的结构化分析。",
          "必须覆盖：",
          "1. 核心技能关键词（5-8 个，按重要性排序）",
          "2. 必备经验（年资、领域、行业）",
          "3. 加分项（证书、工具、软技能）",
          "4. 岗位级别与团队定位",
          "5. 简历应突出的 3 个核心方向",
          "只输出分析结果，不要客套话。",
        ].join("\n"),
        userPromptTemplate: `请分析以下岗位描述：\n\n${lastMessage}`,
      },
      {
        id: "collect",
        type: "chat" as const,
        description: "整理已收集信息",
        dependsOn: ["analyze-jd"],
        systemPrompt:
          "你是中文求职简历向导。用户的 JD 已经提供，个人经历可能不完整。你的任务很简短：总结已有的关键信息（一两句话），然后直接告诉用户'信息已足够，现在为你生成一份完整的简历'。不要追问缺失信息，后续会基于 JD 合理补全。",
        userPromptTemplate: userContext,
      },
      {
        id: "generate",
        type: "structured" as const,
        description: "生成岗位定制中文简历",
        dependsOn: ["analyze-jd", "collect"],
        schema: resumeSchema,
        systemPrompt,
        userPromptTemplate: ({ stepResults }) => {
          const jdAnalysis =
            (stepResults["analyze-jd"] as { text?: string } | undefined)?.text ?? "";
          return [
            "请基于以下信息生成一份完整的中文简历 JSON。",
            "",
            "## JD 深度分析",
            jdAnalysis,
            "",
            "## 对话记录",
            userContext,
            "",
            "## 核心要求",
            "1. 严格基于 JD 分析中的关键词和方向来组织内容",
            "2. 所有模块必须填充完整，不允许留空或使用空字符串/空数组",
            "3. 用户未提供的细节（公司名、学校名、项目名、时间等），基于 JD 合理推断补全",
            "4. header/summary/work-experience/skills 为必填，education/projects 也需生成",
            "5. 每个模块 id 为稳定字符串；order 从 0 递增；visible 为 true",
            "6. summary 要体现与目标岗位的匹配度",
          ].join("\n\n");
        },
      },
      {
        id: "critic",
        type: "chat" as const,
        description: "审查简历质量",
        dependsOn: ["generate"],
        systemPrompt: [
          "你是资深简历审查专家。审查以下简历 JSON，标记具体问题。",
          "不要修改内容，只输出问题清单。检查项：",
          "1. 被动语态/弱动词（'负责'、'参与' 等）→ 应改为结果导向的强动词",
          "2. 缺少量化数据（没有数字、百分比、规模）",
          "3. 内容重复（不同模块说了类似的话）",
          "4. 与 JD 关键词不匹配（JD 要求的技能在简历中缺失）",
          "5. 模块长度失衡（某个模块过长或过短）",
          "按模块和条目逐项标记，例如：'work-experience[0].description: 弱动词'负责'，建议改为具体成果'。",
        ].join("\n"),
        userPromptTemplate: ({ stepResults }) =>
          JSON.stringify(stepResults.generate, null, 2),
      },
      {
        id: "refine",
        type: "structured" as const,
        description: "精修简历问题",
        dependsOn: ["generate", "critic"],
        schema: resumeSchema,
        systemPrompt: [
          "你是简历润色专家。基于审查意见修复简历。",
          "关键原则：只修改被标记的部分，未标记的内容必须保持原样，一个字都不改。",
          "输出完整的修复后 Resume JSON。",
        ].join("\n"),
        userPromptTemplate: ({ stepResults }) => {
          const criticResult =
            (stepResults.critic as { text?: string } | undefined)?.text ?? "";
          return [
            "## 原简历 JSON",
            JSON.stringify(stepResults.generate, null, 2),
            "",
            "## 审查意见",
            criticResult,
            "",
            "请基于审查意见输出修复后的简历 JSON，只修改被标记的部分。",
          ].join("\n\n");
        },
      },
      {
        id: "validate",
        type: "tool" as const,
        description: "校验简历结构",
        dependsOn: ["refine"],
        tool: "validateResume",
        toolArgs: ({ stepResults }) => ({
          resume: stepResults.refine,
        }),
      },
      {
        id: "present",
        type: "compose" as const,
        description: "输出最终简历",
        dependsOn: ["validate"],
        compose: ({ stepResults }) =>
          normalizeResumeOrder(resumeSchema.parse(stepResults.refine)),
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
