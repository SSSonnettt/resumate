import type { ChatMessage } from "./llm/types";

// ============ Types ============

export type HookPoint = "beforePlan" | "afterPlan" | "beforeStep" | "afterStep";

export interface HookContext {
  planId?: string;
  stepId?: string;
  stepType?: string;
  stepResult?: unknown;
  stepResults?: Record<string, unknown>;
  duration?: number;
  tokensUsed?: number;
  messages?: ChatMessage[];
  budget?: { total: number; remaining: number };
}

export type HookResult =
  | { action: "continue" }
  | { action: "block"; reason: string };

export interface Hook {
  point: HookPoint;
  priority: number;
  name: string;
  handler: (context: HookContext) => Promise<HookResult>;
}

// ============ HookManager ============

export class HookManager {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  async executeHooks(point: HookPoint, context: HookContext): Promise<HookResult> {
    for (const hook of this.hooks.filter(h => h.point === point)) {
      const result = await hook.handler(context);
      if (result.action === "block") {
        return { ...result, reason: `[${hook.name}] ${result.reason}` };
      }
    }
    return { action: "continue" };
  }
}

// ============ Built-in Hooks ============

/**
 * Token 预算检查 Hook (beforeStep, priority 10)
 * 估算当前步骤 prompt token 消耗，如果超过剩余预算则 block
 */
export function createTokenBudgetHook(totalBudget: number = 100000): Hook {
  let used = 0;

  return {
    point: "beforeStep",
    priority: 10,
    name: "tokenBudget",
    handler: async (context) => {
      // 简单估算：基于 messages 长度
      const messages = context.messages ?? [];
      const estimatedTokens = messages.reduce((sum, m) => sum + estimateTokenCount(m.content), 0);

      if (used + estimatedTokens > totalBudget) {
        return {
          action: "block",
          reason: `Token 预算不足：已使用 ${used}，预估需要 ${estimatedTokens}，总预算 ${totalBudget}`,
        };
      }

      used += estimatedTokens;
      return { action: "continue" };
    },
  };
}

/**
 * 安全过滤 Hook (afterStep, priority 20)
 * 检测步骤输出中是否包含 PII（身份证号、银行卡号、手机号）
 *
 * @param options.contextAware 是否启用上下文感知过滤（header 中放行邮箱/手机号）
 */
export function createSafetyFilterHook(options?: { contextAware?: boolean }): Hook {
  const contextAware = options?.contextAware ?? false;

  // 非上下文感知模式：使用原有的简单正则
  const piiPatterns = [
    { name: "身份证号", pattern: /\b\d{17}[\dXx]\b/ },
    { name: "银行卡号", pattern: /\b\d{16,19}\b/ },
    { name: "手机号", pattern: /\b1[3-9]\d{9}\b/ },
  ];

  return {
    point: "afterStep",
    priority: 20,
    name: "safetyFilter",
    handler: async (context) => {
      if (contextAware) {
        // 上下文感知模式：根据步骤语义区分合法/非法 PII
        const resultStr = JSON.stringify(context.stepResult ?? "");

        // 简历产出步骤（collect/generate/refine/present）合法包含联系方式
        // structured/compose 步骤的输出经 Zod schema 约束，本身就应含手机/邮箱
        const resumeStepIds = ["collect", "generate", "refine", "present"];
        const isResumeProducer =
          context.stepType === "structured" ||
          context.stepType === "compose" ||
          resumeStepIds.includes(context.stepId ?? "");

        const alwaysCheckPatterns = [
          { name: "身份证号", pattern: /\b\d{17}[\dXx]\b/ },
          { name: "银行卡号", pattern: /\b\d{16,19}\b/ },
        ];

        const optionalPatterns = [
          { name: "手机号", pattern: /\b1[3-9]\d{9}\b/ },
          { name: "邮箱", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
        ];

        const patterns = isResumeProducer
          ? alwaysCheckPatterns
          : [...alwaysCheckPatterns, ...optionalPatterns];

        for (const { name, pattern } of patterns) {
          if (pattern.test(resultStr)) {
            return {
              action: "block",
              reason: `输出包含疑似 ${name}，已阻断`,
            };
          }
        }

        return { action: "continue" };
      }

      // 非上下文感知模式：保持原有行为
      const resultStr = JSON.stringify(context.stepResult ?? "");

      for (const { name, pattern } of piiPatterns) {
        if (pattern.test(resultStr)) {
          return {
            action: "block",
            reason: `输出包含疑似 ${name}，已阻断`,
          };
        }
      }

      return { action: "continue" };
    },
  };
}

/**
 * 日志记录 Hook (afterStep, priority 100)
 * 记录 stepId、duration、结果摘要
 */
export function createLoggingHook(): Hook {
  return {
    point: "afterStep",
    priority: 100,
    name: "logging",
    handler: async (context) => {
      const resultSummary = context.stepResult
        ? JSON.stringify(context.stepResult).slice(0, 200)
        : "(no result)";

      console.log(
        `[Harness] step=${context.stepId} type=${context.stepType} duration=${context.duration ?? 0}ms result=${resultSummary}`,
      );

      return { action: "continue" };
    },
  };
}

// ============ Internal Helper ============

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // 中文字符约 1 token/字，英文约 4 字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return chineseChars + Math.ceil(otherChars / 4);
}
