import type { Resume, HarnessEvent } from "@resumate/shared";
import { z } from "zod";
import type { LLMProvider } from "./llm/types";

// ============ ResumeScore — 简历质量评分 ============

/** 简历质量多维度评分结果 */
export interface ResumeScore {
  /** ATS 关键词覆盖率 0-100 */
  atsCompatibility: number;
  /** 内容质量（STAR 覆盖率、量化指标密度）0-100 */
  contentQuality: number;
  /** 必填模块完成度 0-100 */
  completeness: number;
  /** 加权总分（ATS×0.3 + Content×0.4 + Completeness×0.3） */
  overall: number;
}

/**
 * 对简历进行规则化质量评分。
 *
 * 三个维度：
 * - atsCompatibility: JD 关键词在简历 JSON 文本中的覆盖率
 * - contentQuality: STAR 要素正则检测 + 量化指标密度
 * - completeness: header/work-experience/education/skills 必填模块存在性检查
 *
 * 注意：此评分基于正则规则估算，作为参考建议而非绝对标准。
 *
 * @param resume 待评分的简历对象
 * @param jdKeywords 可选的 JD 关键词数组，用于 ATS 兼容性计算
 */
export function scoreResume(
  resume: Resume,
  jdKeywords?: string[],
): ResumeScore {
  const resumeText = JSON.stringify(resume);

  const atsCompatibility = computeATSCompatibility(resumeText, jdKeywords);
  const contentQuality = computeContentQuality(resume);
  const completeness = computeCompleteness(resume);
  const overall = Math.round(
    atsCompatibility * 0.3 + contentQuality * 0.4 + completeness * 0.3,
  );

  return { atsCompatibility, contentQuality, completeness, overall };
}

// ---- 内部评分函数 ----

function computeATSCompatibility(
  resumeText: string,
  jdKeywords?: string[],
): number {
  if (!jdKeywords || jdKeywords.length === 0) return 0;

  const lowerText = resumeText.toLowerCase();
  const matched = jdKeywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
  return Math.round((matched.length / jdKeywords.length) * 100);
}

function computeContentQuality(resume: Resume): number {
  const data = resume.data;
  const items = data.work ?? [];

  if (items.length === 0) return 0;

  let starScore = 0;
  let quantScore = 0;
  const totalItems = items.length;

  for (const item of items) {
    const desc = (item.summary as string) ?? "";

    // STAR 要素检测（情境/任务/行动/结果各占 1/4）
    const hasSitu = /(背景|面临|环境|场景|当时)/.test(desc) ? 1 : 0;
    const hasTask = /(负责|任务|目标|需要|要求|职责)/.test(desc) ? 1 : 0;
    const hasAct = /(主导|设计|优化|重构|开发|搭建|实施|推动|建立|制定)/.test(desc)
      ? 1
      : 0;
    const hasRes = /(\d+%|\d+\s*倍|[0-9]+[万亿千百]+|提升|降低|增长|减少|缩短)/.test(
      desc,
    )
      ? 1
      : 0;
    starScore += (hasSitu + hasTask + hasAct + hasRes) / 4;

    // 量化指标密度
    const quantMatches = (desc.match(/\d+/g) || []).length;
    quantScore += Math.min(quantMatches / 3, 1); // 最多计 3 个数字为满分
  }

  return Math.round(
    ((starScore / totalItems) * 0.6 + (quantScore / totalItems) * 0.4) * 100,
  );
}

function computeCompleteness(resume: Resume): number {
  const data = resume.data;
  let score = 0;

  // basics (header) — 25 分
  if (data.basics?.name) {
    score += 25;
  }
  // work — 25 分
  if (data.work && data.work.length > 0) {
    score += 25;
  }
  // education — 25 分
  if (data.education && data.education.length > 0) {
    score += 25;
  }
  // skills — 25 分
  if (data.skills && data.skills.length > 0) {
    score += 25;
  }

  return score;
}

// ============ ExecutionTrace — 执行追踪 ============

/** 单个步骤的执行追踪 */
export interface StepTrace {
  stepId: string;
  type: string;
  startTime: number;
  endTime: number;
  success: boolean;
  errorMessage?: string;
  retryCount: number;
}

/** 一次 Plan 执行的完整追踪 */
export interface ExecutionTrace {
  planId: string;
  startTime: number;
  endTime: number;
  steps: StepTrace[];
}

/**
 * 从 HarnessEvent 流构建执行追踪对象。
 *
 * 纯函数，可在 AgentRunner 外部异步调用，不影响主流程。
 *
 * @param events HarnessEvent 数组
 */
export function buildTrace(events: HarnessEvent[]): ExecutionTrace {
  const trace: ExecutionTrace = {
    planId: "",
    startTime: 0,
    endTime: 0,
    steps: [],
  };

  const activeSteps = new Map<
    string,
    { startTime: number; type: string; retryCount: number }
  >();

  for (const event of events) {
    switch (event.type) {
      case "plan:start":
        trace.planId = event.planId;
        trace.startTime = Date.now();
        break;

      case "step:start":
        activeSteps.set(event.stepId, {
          startTime: Date.now(),
          type: "",
          retryCount: 0,
        });
        break;

      case "step:tool_call":
        // 更新步骤类型
        {
          const active = activeSteps.get(event.stepId);
          if (active) active.type = "tool";
        }
        break;

      case "step:chunk":
        // 标记为 chat 类型（如有 chunk 事件）
        {
          const active = activeSteps.get(event.stepId);
          if (active && !active.type) active.type = "chat";
        }
        break;

      case "step:retry":
        {
          const active = activeSteps.get(event.stepId);
          if (active) active.retryCount = event.attempt;
        }
        break;

      case "step:done": {
        const active = activeSteps.get(event.stepId);
        if (active) {
          trace.steps.push({
            stepId: event.stepId,
            type: active.type || "unknown",
            startTime: active.startTime,
            endTime: Date.now(),
            success: true,
            retryCount: active.retryCount,
          });
          activeSteps.delete(event.stepId);
        }
        break;
      }

      case "plan:error": {
        const active = activeSteps.get(event.stepId);
        if (active) {
          trace.steps.push({
            stepId: event.stepId,
            type: active.type || "unknown",
            startTime: active.startTime,
            endTime: Date.now(),
            success: false,
            errorMessage: event.error,
            retryCount: active.retryCount,
          });
          activeSteps.delete(event.stepId);
        }
        break;
      }

      case "step:skipped":
        activeSteps.delete(event.stepId);
        break;

      default:
        break;
    }
  }

  trace.endTime = Date.now();
  return trace;
}

// ============ LLM-as-Judge ============

const judgeResultSchema = z.object({
  professionalism: z.number().min(0).max(100).describe("专业性与术语准确度"),
  impact: z.number().min(0).max(100).describe("量化成果与影响力"),
  completeness: z.number().min(0).max(100).describe("各模块信息充分度"),
  atsFriendliness: z.number().min(0).max(100).describe("ATS 友好度"),
  overall: z.number().min(0).max(100).describe("综合评分"),
  feedback: z.string().describe("具体改进建议"),
});

/** LLM-as-Judge 评估结果 */
export type JudgeResult = z.infer<typeof judgeResultSchema>;

/**
 * 使用独立的 LLMProvider 评估简历主观质量。
 *
 * **@experimental** — 此功能需要额外的 LLM API 调用，适用于评估场景。
 * 建议使用与主生成流程不同的模型（如更强或更快的模型）。
 *
 * @param resume 待评估的简历
 * @param judgeProvider 用于评判的 LLMProvider 实例
 */
export async function llmJudgeResume(
  resume: Resume,
  judgeProvider: LLMProvider,
): Promise<JudgeResult> {
  const prompt = `你是一位资深 HR 和简历评审专家。请评估以下简历：

${JSON.stringify(resume, null, 2)}

评估维度：
1. 专业性：描述是否使用专业术语和行业标准表达
2. 影响力：是否突出了可量化的成果和影响
3. 完整性：各模块信息是否充分
4. ATS 友好度：格式和关键词是否适合自动筛选

请输出 JSON 格式的评分结果。`;

  return judgeProvider.generateStructured<JudgeResult>({
    messages: [{ role: "user", content: prompt }],
    schema: judgeResultSchema,
  });
}
