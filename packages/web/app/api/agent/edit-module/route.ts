import { NextRequest } from "next/server";
import {
  AnthropicProvider,
  OpenAICompatProvider,
} from "@resumate/agent-harness";
import type { LLMProvider } from "@resumate/agent-harness";
import {
  basicsSchema,
  workItemSchema,
  educationItemSchema,
  skillItemSchema,
  projectItemSchema,
} from "@resumate/shared";
import { z } from "zod";

const sectionKeys = ["basics", "work", "education", "skills", "projects"] as const;
type SectionKey = (typeof sectionKeys)[number];

const editRequestSchema = z.object({
  provider: z.enum(["anthropic", "openai-compat"]).default("openai-compat"),
  apiKey: z.string(),
  baseURL: z.string().optional(),
  model: z.string().optional(),
  section: z.enum(sectionKeys),
  data: z.record(z.unknown()),
  instruction: z.string().min(1, "请输入编辑指令"),
  jdContext: z.string().optional(),
});

const SECTION_PROMPTS: Record<SectionKey, { label: string; hint: string }> = {
  basics: {
    label: "基本信息",
    hint: "姓名、职位标题、联系方式。职位标题应与 JD 对齐。summary 要体现核心竞争力。",
  },
  work: {
    label: "工作经历",
    hint: "每条经历用 STAR 结构，描述用结果导向的强动词。包含量化数据（规模、提升百分比）。",
  },
  education: {
    label: "教育背景",
    hint: "学校、学位、专业、时间。如有相关课程或荣誉可补充。",
  },
  skills: {
    label: "技能",
    hint: "按类别分组（如编程语言、工具平台、领域知识）。优先列出 JD 要求的关键技能。",
  },
  projects: {
    label: "项目经历",
    hint: "项目名、简短描述、技术栈。每个项目突出 1-2 个关键成果。",
  },
};

export async function POST(request: NextRequest) {
  const parsed = editRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "请求格式不正确",
        details: parsed.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { provider, apiKey, baseURL, model, section, data, instruction, jdContext } =
    parsed.data;
  const llmProvider = createLLMProvider({ provider, apiKey, baseURL, model });
  const prompt = SECTION_PROMPTS[section];
  const dataSchema = getDataSchema(section);

  const systemPrompt = [
    "你是专业简历编辑器。用户要求修改简历中的" + prompt.label + "。",
    prompt.hint,
  ].join("\n");

  const userPrompt = [
    "## 当前数据（JSON）",
    JSON.stringify(data, null, 2),
    jdContext ? `\n## 目标岗位 JD\n${jdContext}` : "",
    `\n## 用户要求\n${instruction}`,
    `\n\n请输出修改后的 ${prompt.label} 数据（纯 JSON），不要包含其他文字。`,
    "保持字段结构与当前数据一致，只修改用户要求的部分。若需新增条目，确保字段完整。",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await llmProvider.generateStructured({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      schema: dataSchema,
      temperature: 0.4,
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "AI 编辑失败",
        message: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

function getDataSchema(type: SectionKey) {
  switch (type) {
    case "basics":
      return basicsSchema;
    case "work":
      return z.array(workItemSchema);
    case "education":
      return z.array(educationItemSchema);
    case "skills":
      return z.array(skillItemSchema);
    case "projects":
      return z.array(projectItemSchema);
  }
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
      baseURL:
        config.baseURL ||
        process.env.OPENAI_BASE_URL ||
        "https://api.openai.com/v1",
      model: config.model || process.env.OPENAI_MODEL || "gpt-4o",
    });
  }
  return new AnthropicProvider(config.apiKey || undefined);
}
