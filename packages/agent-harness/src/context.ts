import type { ChatMessage } from "./llm/types";

/**
 * 对话摘要器 — 上下文工程的核心工具
 *
 * 三层策略：
 * 1. 结构化信息摘要（已收集的 stepResults）
 * 2. 最近 N 轮对话原文（保持连贯性）
 * 3. 早期对话的精简摘要（节省 token）
 */
export function summarizeConversation(
  messages: ChatMessage[],
  collectedInfo: Record<string, unknown> = {},
  maxRecentRounds: number = 3,
): string {
  const parts: string[] = [];

  // 层1: 已收集的结构化信息
  const infoKeys = Object.keys(collectedInfo).filter(
    (k) => collectedInfo[k] !== undefined && collectedInfo[k] !== null,
  );
  if (infoKeys.length > 0) {
    parts.push("## 已收集的信息");
    for (const key of infoKeys) {
      const value = collectedInfo[key];
      const display = typeof value === "object"
        ? JSON.stringify(value, null, 0).slice(0, 200)
        : String(value).slice(0, 200);
      parts.push(`- ${key}: ${display}`);
    }
  }

  // 层2+3: 对话处理
  // 过滤掉 system 消息
  const conversationMessages = messages.filter((m) => m.role !== "system");

  // 每轮 = 一对 user + assistant 消息
  const maxRecentMessages = maxRecentRounds * 2;

  if (conversationMessages.length > maxRecentMessages) {
    // 早期消息：只保留精简摘要
    const earlyMessages = conversationMessages.slice(0, -maxRecentMessages);
    parts.push("## 早期对话摘要");
    for (const msg of earlyMessages) {
      const role = msg.role === "user" ? "用户" : "助手";
      const truncated = msg.content.slice(0, 80).replace(/\n/g, " ");
      parts.push(`${role}: ${truncated}${msg.content.length > 80 ? "..." : ""}`);
    }
  }

  // 最近 N 轮：保留原文
  const recentMessages = conversationMessages.slice(-maxRecentMessages);
  if (recentMessages.length > 0) {
    parts.push("## 最近对话");
    for (const msg of recentMessages) {
      const role = msg.role === "user" ? "用户" : "助手";
      parts.push(`${role}: ${msg.content}`);
    }
  }

  return parts.join("\n\n");
}

/**
 * Token 估算器
 * 中文字符约 1 token/字，英文约 4 字符/token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return chineseChars + Math.ceil(otherChars / 4);
}
