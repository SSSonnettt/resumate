import { NextRequest } from "next/server";
import {
  AgentRunner,
  AnthropicProvider,
  OpenAICompatProvider,
  createBuiltInTools,
  HookManager,
  createTokenBudgetHook,
  createSafetyFilterHook,
  createLoggingHook,
} from "@resumate/agent-harness";
import type { LLMProvider } from "@resumate/agent-harness";
import type { Plan } from "@resumate/agent-harness";
import {
  jsonResumeSchema,
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
  fileContents: z.array(z.string()).optional(),
});

const systemPrompt = [
  "你是一个面向中文求职者的 AI 简历工作台。",
  "你的任务是根据用户提供的真实个人信息和目标岗位 JD，生成一份完整、可直接投递的中文简历。",
  "简历必须具体、职业化，优先突出与 JD 匹配的经历、技能和项目。",
  "使用用户在对话中提供的真实信息——姓名、公司、学校、时间等都应该来自对话记录。",
  "如果用户在对话中确实未提供某些信息（如联系方式、某些技能细节），可以留空或用 [待补充] 标记，",
  "但主要经历和技能必须来自用户真实输入，不得编造。",
  "输出必须严格符合 JSON Resume 标准格式 (https://jsonresume.org/schema/)。",
].join("\n");

function createResumeGenerationPlan(
  messages: Array<{ role: string; content: string }>,
  fileContents?: string[],
): Plan {
  const userContext = JSON.stringify(messages, null, 2);

  // 将上传文件的解析文本注入 collect 步骤的 prompt
  const fileContext = (fileContents || []).length > 0
    ? "\n\n" + fileContents!.map((text, i) => `[上传文件 #${i + 1} 的解析文本，全文如下]\n${text}`).join("\n\n")
    : "";

  // classify 步骤的输入：汇总聊天收集阶段的所有对话信息（用户+AI 分析）
  const collectedInput = messages
    .map((m) => m.content)
    .join("\n\n");

  const classifyInput = (fileContents || []).length > 0
    ? fileContents!.map((text, i) => `[已上传文件 #${i + 1}，共 ${text.length} 字符]`).join("\n") + "\n" + collectedInput
    : collectedInput;

  // analyze-jd 步骤使用用户最后一条消息（通常包含 JD 文本）
  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .at(-1)?.content ?? "";

  return {
    id: "jd-tailored-resume-generation",
    steps: [
      {
        id: "classify",
        type: "tool" as const,
        description: "识别用户当前输入意图",
        tool: "classifyIntent",
        toolArgs: { input: classifyInput },
      },
      {
        id: "analyze-jd",
        type: "chat" as const,
        description: "深度分析岗位 JD",
        dependsOn: ["classify"],
        condition: ({ stepResults }) => {
          const classify = stepResults.classify as { intent?: string } | undefined;
          return classify?.intent === "jd_optimize";
        },
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
        userPromptTemplate: `请分析以下岗位描述：\n\n${lastUserMessage}`,
      },
      {
        id: "collect",
        type: "chat" as const,
        description: "整理已收集信息",
        dependsOn: ["analyze-jd"],
        systemPrompt:
          "你是中文简历信息整理专家。从对话记录中提取用户提供的所有个人信息，按以下结构输出：\n1. 基本信息（姓名、求职意向、联系方式）\n2. 工作经历（公司、职位、时间、描述和成果）\n3. 教育背景（学校、学历、专业、时间）\n4. 技能标签（语言、框架、工具）\n5. 项目经历（名称、描述、技术栈）\n6. 其他补充\n只输出用户明确提供的信息，未提供的信息标注'未提供'。不编造任何信息。",
        userPromptTemplate: userContext + fileContext,
      },
      {
        id: "generate",
        type: "structured" as const,
        description: "生成岗位定制中文简历",
        dependsOn: ["analyze-jd", "collect"],
        maxRetries: 2,
        schema: jsonResumeSchema,
        systemPrompt,
        userPromptTemplate: ({ stepResults }) => {
          const jdAnalysis =
            (stepResults["analyze-jd"] as { text?: string } | undefined)?.text ?? "";
          const collectOutput =
            (stepResults.collect as { text?: string } | undefined)?.text;
          const userInfo = collectOutput || userContext;
          return [
            "请基于以下信息生成一份完整的中文简历 JSON。",
            "",
            "## JD 深度分析",
            jdAnalysis,
            "",
            "## 用户信息整理",
            userInfo,
            "",
            "## 核心要求",
            "1. 严格基于 JD 分析中的关键词和方向来组织内容",
            "2. 使用已整理的用户的真实信息（姓名、公司、学校等）",
            "3. 用户未提供的细节可留空或标记 [待补充]，不得编造",
            "4. basics/education/skills 为必填，work/projects 也需生成",
            "5. summary 要体现与目标岗位的匹配度",
            "6. 严格输出 JSON Resume 标准格式，不要有额外字段",
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
        maxRetries: 2,
        condition: ({ stepResults }) => {
          const criticResult = (stepResults.critic as { text?: string } | undefined)?.text ?? "";
          return criticResult.length > 20;
        },
        schema: jsonResumeSchema,
        systemPrompt: [
          "你是简历润色专家。基于审查意见修复简历。",
          "关键原则：只修改被标记的部分，未标记的内容必须保持原样，一个字都不改。",
          "输出完整的修复后 JSON Resume 格式数据。",
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
        toolArgs: ({ stepResults }) => {
          const refineResult = stepResults.refine as Record<string, unknown> | undefined;
          const resume = (refineResult?.skipped ? stepResults.generate : stepResults.refine);
          return { resume };
        },
      },
      {
        id: "present",
        type: "compose" as const,
        description: "输出最终简历",
        dependsOn: ["validate"],
        compose: ({ stepResults }) => {
          const refineResult = stepResults.refine as Record<string, unknown> | undefined;
          const bestCandidate = (refineResult?.skipped ? stepResults.generate : stepResults.refine);
          // 将 JSON Resume 数据包装为 ResumeV4 格式
          const wrapResume = (data: unknown) => {
            const parsed = jsonResumeSchema.safeParse(data);
            if (parsed.success) {
              return resumeSchema.parse({
                id: "generated",
                data: parsed.data,
                themeSlug: "flat",
              });
            }
            return null;
          };
          const wrapped = wrapResume(bestCandidate);
          if (wrapped) return wrapped;
          const fallback = wrapResume(stepResults.generate);
          if (fallback) return fallback;
          console.warn("present: all candidates failed, returning empty fallback");
          return resumeSchema.parse({
            id: "fallback",
            data: {},
            themeSlug: "flat",
          });
        },
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

  const { messages, apiKey, provider, baseURL, model, fileContents } = parsed.data;
  const llmProvider = createLLMProvider({ provider, apiKey, baseURL, model });
  const registry = createBuiltInTools();
  const hooks = new HookManager();
  hooks.register(createTokenBudgetHook(200000));
  hooks.register(createSafetyFilterHook({ contextAware: true }));
  hooks.register(createLoggingHook());
  const runner = new AgentRunner(llmProvider, registry, hooks);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const plan = createResumeGenerationPlan(messages, fileContents);

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
