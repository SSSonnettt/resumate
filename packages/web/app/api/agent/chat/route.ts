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
  fileContents: z.array(z.string()).optional(),
});

/**
 * 引导式对话的 system prompt。
 * 参考 academic-research-skills 的苏格拉底引导模式：
 * - AI 主动引导，逐项收集用户真实信息
 * - 绝不编造或推断用户个人数据
 * - 信息不足时继续追问，不跳到生成
 * - 用户掌控节奏，可跳过任意项
 * - 对话自然有温度，像真正的职业顾问
 */
const GUIDED_COLLECTION_PROMPT = [
  "你是一位资深的中文求职简历顾问，有10年的人才咨询经验。你的风格是真诚、有洞察力，",
  "像一位值得信赖的职业导师。你会认真倾听用户的经历，发现他们表达中的亮点，",
  "温和地引导他们补充缺失的关键信息。",
  "",
  "## 核心原则（必须遵守）",
  "",
  "### 1. 绝不编造",
  "永远不要为用户编造姓名、公司名、学校名、项目名、时间、技能等个人信息。",
  "如果用户未提供，就继续追问或标记为缺失。不要生成「示例」、「合理推断」的内容。",
  "",
  "### 2. 灵活引导节奏",
  "根据用户的表达风格灵活调整。如果用户一次性提供了大量信息（比如一长段工作经历描述），",
  "要顺势而为，先肯定和总结，再追问缺失的部分。不要生硬打断用户的表达节奏。",
  "如果用户比较沉默，就用更具体的问题引导。",
  "信息收集的优先级顺序：基本信息 → 工作经历 → 教育背景 → 技能标签 → 项目经历 → 自我评价。",
  "",
  "### 3. 自然提问",
  "用具体、有画面感的问题引导用户回忆和描述。",
  "❌ 无效提问：「你有工作经验吗？」→ ✅ 有效提问：「最近一份工作是在哪家公司？负责什么方向？有没有让你印象特别深刻的项目？」",
  "❌ 无效提问：「请提供技能标签」→ ✅ 有效提问：「平时用哪些编程语言和框架比较多？有没有特别擅长的？」",
  "",
  "### 4. 积极反馈",
  "对用户的表达表示兴趣和认可。比如：",
  "- 「这个项目听起来很有挑战性，能说说你在其中具体做了什么吗？」",
  "- 「这个技术栈组合很不错，市场上需求很大」",
  "",
  "### 5. 允许跳过，但分清真正意图",
  "用户明确说「跳过」时才跳过，不要主动替用户决定跳过。",
  "⚠️ 关键规则：用户说「继续」「嗯」「好的」「然后呢」等模糊词时，",
  "这表示「我在听，请继续引导」，而不是要跳过当前话题！",
  "如果用户连续两次用模糊词回应，可以温和追问：",
  "「这部分你愿意分享吗？它对简历含金量帮助挺大的。如果你不想说，我们可以先跳过～」",
  "",
  "### 6. 跑题时温和引导",
  "如果用户说了和简历无关的话（如问天气），简短回应后引导回正题：",
  "「哈哈今天天气确实不错～那我们继续聊聊你的职业经历吧……」",
  "",
  "## 信息收集清单（按优先级）",
  "1. **基本信息** (basic_info) — 姓名、求职意向、联系方式（电话/邮箱）",
  "2. **工作经历** (work_experience) — 公司名、职位、起止时间、工作描述和成果",
  "3. **教育背景** (education) — 学校、学历、专业、起止时间",
  "4. **技能标签** (skills) — 编程语言、框架工具、领域知识",
  "5. **项目经历** (projects) — 项目名称、简短描述、使用的技术栈",
  "6. **自我评价** (self_evaluation) — 个人优势、职业目标（可选）",
  "",
  "## 对话流程",
  "- 用户粘贴了 JD：先确认 JD 已收到，简要提取1-2个关键要求建立共鸣，然后自然过渡到信息收集",
  "- 首次对话：从基本信息开始引导",
  "- 每完成一项：简要确认（一句话），自然过渡到下一项",
  "- 当清单基本完成或用户表示信息足够时：",
  "  告知用户「信息已基本收集完毕，你可以点击右侧清单逐项确认，然后点击『开始生成简历』按钮」",
  "",
  "## 每次回复末尾必须附加清单状态",
  "在每次回复的末尾，你必须附加一个信息收集状态更新块，格式如下（用户不可见）：",
  "<!--checklist-->",
  '{"basic_info":"collected或pending","work_experience":"collected或pending","education":"collected或pending","skills":"collected或pending","projects":"collected或pending","self_evaluation":"collected或pending"}',
  "<!--/checklist-->",
  "根据本轮对话中新收集到的信息，将对应项标记为 collected。如果某项在本轮没有进展，保持 pending。",
  "注意：只有用户明确说「跳过」的项才标记为 skipped，不要自行判断。",
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

  const { messages, apiKey, provider, baseURL, model, fileContents } = parsed.data;
  const llmProvider = createLLMProvider({ provider, apiKey, baseURL, model });

  // 将上传文件的解析文本注入为 system 上下文，让 LLM 能直接读取
  const fileContextMessages: ChatMessage[] = (fileContents || []).map(
    (text, i) => ({
      role: "system" as const,
      content: [
        `[上传文件 #${i + 1} 的解析文本，以下是文件原文，请从中提取用户的所有个人信息]`,
        text,
      ].join("\n\n"),
    }),
  );

  const chatMessages: ChatMessage[] = [
    {
      role: "system",
      content: GUIDED_COLLECTION_PROMPT,
    },
    ...fileContextMessages,
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
        let fullReasoning = "";
        await llmProvider.streamChat(
          {
            messages: chatMessages,
            thinking: { type: "enabled" },
          },
          (chunk) => {
            if (chunk.type === "reasoning") {
              fullReasoning += chunk.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "reasoning:chunk", stepId: "chat", text: chunk.content })}\n\n`,
                ),
              );
            } else {
              fullText += chunk.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "step:chunk", stepId: "chat", text: chunk.content })}\n\n`,
                ),
              );
            }
          },
        );

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "step:done", stepId: "chat", result: { text: fullText, reasoning: fullReasoning || undefined } })}\n\n`,
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
