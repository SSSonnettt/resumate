import { NextRequest } from "next/server";
import {
  AnthropicProvider,
  OpenAICompatProvider,
} from "@resumate/agent-harness";
import type { LLMProvider, ChatMessage } from "@resumate/agent-harness";
import { z } from "zod";

const chatRequestSchema = z.object({
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

/**
 * 引导式对话的 system prompt。
 * 参考 academic-research-skills 的苏格拉底引导模式：
 * - AI 主动引导，逐项收集用户真实信息
 * - 绝不编造或推断用户个人数据
 * - 信息不足时继续追问，不跳到生成
 * - 用户掌控节奏，可跳过任意项
 */
const GUIDED_COLLECTION_PROMPT = [
  "你是一位专业的中文求职简历顾问。你的核心任务是通过对话引导用户提供完整的简历信息。",
  "",
  "## 核心原则（必须遵守）",
  "1. **绝对不编造**：永远不要为用户编造姓名、公司名、学校名、项目名、时间、技能等个人信息。",
  "   如果用户未提供，就追问或标记为缺失。不要生成「示例」、「合理推断」的内容。",
  "2. **逐项引导**：每轮只聚焦 1-2 个信息项，不要一次性问太多。",
  "   按优先级顺序：基本信息 → 工作经历 → 教育背景 → 技能标签 → 项目经历 → 自我评价。",
  "3. **苏格拉底式提问**：用具体问题引导用户回忆和描述。",
  "   例如不要问「你有工作经验吗」，而是问「最近一份工作是在哪家公司？负责什么方向？」",
  "4. **识别一次性多信息**：如果用户一次性提供了多项信息，逐一确认并告知已收集的内容。",
  "5. **允许跳过**：用户可以回复「跳过」跳过某项。不要强迫用户提供不想说的信息。",
  "6. **检查点确认**：每次收集到信息后，简要确认已收集了什么，然后进入下一项。",
  "",
  "## 信息收集清单（按优先级）",
  "1. 基本信息 — 姓名、求职意向、联系方式（电话/邮箱）",
  "2. 工作经历 — 每段经历包括：公司名、职位、起止时间、工作描述和成果",
  "3. 教育背景 — 学校、学历、专业、起止时间",
  "4. 技能标签 — 按类别分组：编程语言、框架工具、领域知识等",
  "5. 项目经历 — 项目名称、简短描述、使用的技术栈",
  "6. 自我评价 — 个人优势、职业目标（可选）",
  "",
  "## 对话流程",
  "- 如果用户粘贴了 JD：先确认 JD 已收到，简要提取关键要求，然后开始引导收集个人信息",
  "- 如果用户首次对话：从基本信息开始引导",
  "- 每完成一项：简要确认（一句话），自然过渡到下一项",
  "- 当清单基本完成或用户表示信息足够时：",
  "  告知用户「信息已基本收集完毕，你可以点击右侧清单逐项确认，然后点击开始生成简历按钮」",
  "",
  "## 禁止行为",
  "- 禁止在一次回复中要求用户提供超过 2 项信息",
  "- 禁止编造任何个人信息（姓名、公司、学校等）",
  "- 禁止在信息不足时直接生成简历内容",
  "- 禁止用模板化的语气回复，保持自然、专业的对话风格",
].join("\n");

export async function POST(request: NextRequest) {
  const parsed = chatRequestSchema.safeParse(await request.json());

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

  const { messages, apiKey, provider, baseURL, model } = parsed.data;
  const llmProvider = createLLMProvider({ provider, apiKey, baseURL, model });

  const chatMessages: ChatMessage[] = [
    {
      role: "system",
      content: GUIDED_COLLECTION_PROMPT,
    },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "plan:start", planId: "guided-collection" })}\n\n`,
          ),
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "step:start", stepId: "chat", description: "引导式信息收集" })}\n\n`,
          ),
        );

        let fullText = "";
        await llmProvider.streamChat(
          { messages: chatMessages },
          (chunk: string) => {
            fullText += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "step:chunk", stepId: "chat", text: chunk })}\n\n`,
              ),
            );
          },
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "step:done", stepId: "chat", result: { text: fullText } })}\n\n`,
          ),
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "stream:done" })}\n\n`,
          ),
        );
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "plan:error",
              stepId: "chat",
              error: err instanceof Error ? err.message : String(err),
            })}\n\n`,
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

function createLLMProvider(config: {
  provider: "anthropic" | "openai-compat";
  apiKey?: string;
  baseURL?: string;
  model?: string;
}): LLMProvider {
  if (config.provider === "openai-compat") {
    return new OpenAICompatProvider({
      apiKey:
        config.apiKey ||
        process.env.OPENAI_API_KEY ||
        "",
      baseURL:
        config.baseURL ||
        process.env.OPENAI_BASE_URL ||
        "https://api.openai.com/v1",
      model:
        config.model ||
        process.env.OPENAI_MODEL ||
        "gpt-4o",
    });
  }
  return new AnthropicProvider(config.apiKey || undefined);
}
