/**
 * 提示词风格模块 — 多模板提示词 + A/B 测试基础设施
 *
 * 对应《Harness 理论与实战》第 8 章
 */

// ============ 风格定义 ============

/** 简历风格类型 */
export type PromptStyle = "professional" | "creative" | "concise";

/** 各风格的提示词前缀 */
export const promptByStyle: Record<PromptStyle, string> = {
  professional: "使用正式、专业的商务语言。避免口语化表达。",
  creative:
    "在保持专业性的前提下，允许创意的排版和表达方式。突出个人特色和差异化。",
  concise:
    "极致精简。每个 bullet 不超过 15 个词。使用电报式的简洁风格。优先突出关键数据，省略修饰词。",
};

// ============ 核心提示词片段 ============

/** STAR 法则提示词（含正例和反例） */
export const STAR_PROMPT = [
  "对于每段工作经历，你必须使用 STAR 法则：",
  "- 情境 (Situation)：项目背景或面临的挑战",
  "- 任务 (Task)：你承担的具体职责",
  "- 行动 (Action)：你采取的具体措施",
  "- 结果 (Result)：可量化的成果",
  "",
  "要求：",
  "- 每个 bullet point 至少包含一个数字指标",
  "- 使用主动动词开头（主导、设计、优化、重构）",
  '- 避免模糊描述（"负责日常工作"→ 不合格）',
  "",
  "示例：",
  '✅ "主导电商平台前端重构，将页面加载时间从 4.2s 优化至 1.1s（提升 74%），支撑 GMV 增长 120%"',
  '❌ "负责前端开发工作"',
].join("\n");

/** ATS 兼容性提示词 */
export const ATS_PROMPT = [
  "你必须确保简历对 ATS（Applicant Tracking System）友好：",
  "1. 使用标准章节标题（Work Experience 而非 My Journey）",
  "2. 包含 JD 中提到的精确技能名（JD 写 React.js 就用 React.js，不要简写 React）",
  "3. 避免表格、图片、特殊符号",
  "4. 使用标准日期格式（YYYY.MM - YYYY.MM）",
].join("\n");

// ============ 工具函数 ============

/**
 * 将基础 prompt 与指定风格合并。
 *
 * @param basePrompt 基础系统提示词（Plan 级别）
 * @param style 目标风格（professional / creative / concise）
 * @returns 合并后的完整系统提示词
 */
export function buildStyledPrompt(
  basePrompt: string,
  style: PromptStyle,
): string {
  const stylePrefix = promptByStyle[style];
  return `${basePrompt}\n\n风格要求：${stylePrefix}`;
}
