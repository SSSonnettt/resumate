"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { MessageBubble } from "./message-bubble";
import { JDInput } from "./jd-input";
import type { HarnessEvent, Resume } from "@ai-resume/shared";

type SSERawEvent =
  | HarnessEvent
  | { type: "stream:done" }
  | { type: "stream:error"; error?: string };

function hasResume(
  event: SSERawEvent,
): event is HarnessEvent & { type: "plan:done"; resume: Resume } {
  return event.type === "plan:done" && "resume" in event;
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, addMessage, setStreaming, isStreaming, pushHarnessEvent } =
    useChatStore();
  const { applyAIResult } = useResumeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput("");
    setStreaming(true);

    const assistantMsgId = crypto.randomUUID();
    let assistantContent = "";
    let hasError = false;
    let hasResumeResult = false;

    try {
      const apiKey = localStorage.getItem("ai-api-key") || "";
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`服务器错误 (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6)) as SSERawEvent;

            // 记录 harness 事件（排除 stream:done/error）
            if (data.type !== "stream:done" && data.type !== "stream:error") {
              pushHarnessEvent(data as HarnessEvent);
            }

            // 收集对话文本
            if (data.type === "step:chunk") {
              assistantContent += (data as { text: string }).text;
            }

            // 处理对话步骤完成（AI 提问）
            if (
              data.type === "step:done" &&
              data.stepId === "collect" &&
              data.result &&
              typeof (data.result as Record<string, unknown>).text === "string"
            ) {
              const result = data.result as { text: string };
              if (result.text && !assistantContent) {
                assistantContent = result.text;
              }
            }

            // 简历生成成功
            if (hasResume(data)) {
              applyAIResult(data.resume);
              hasResumeResult = true;
            }

            // 处理错误
            if (data.type === "plan:error") {
              hasError = true;
              const errMsg = (data as { error: string }).error;
              assistantContent = `❌ AI 处理出错：${errMsg}`;
            }
          } catch {
            // 跳过解析失败的行
          }
        }
      }
    } catch (err) {
      hasError = true;
      assistantContent = `❌ 请求失败：${err instanceof Error ? err.message : String(err)}`;
    } finally {
      // 确定最终的 assistant 消息
      let finalContent: string;
      if (hasError) {
        finalContent = assistantContent || "❌ AI 服务出错了，请重试。";
      } else if (hasResumeResult) {
        finalContent =
          assistantContent ||
          "✅ 简历已生成！点击顶部的「打开编辑器 →」进行精调。";
      } else if (assistantContent) {
        finalContent = assistantContent;
      } else {
        finalContent = "AI 正在处理中，请稍候...";
      }

      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: finalContent,
        timestamp: Date.now(),
      });
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部：编辑器入口 */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <span className="text-sm font-semibold text-gray-700">
          AI 简历顾问
        </span>
        <Link
          href="/editor"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          打开编辑器 →
        </Link>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">
              👋 你好！我是你的 AI 简历顾问
            </p>
            <p className="mb-4">
              告诉我你的工作经历、教育背景和技能，我会帮你生成一份专业的简历。
            </p>
            <p className="text-xs text-gray-300">
              也可以直接前往
              <Link
                href="/editor"
                className="text-blue-500 underline mx-1"
              >
                编辑器
              </Link>
              手动创建简历
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t p-4">
        <JDInput
          onSubmit={(text) =>
            sendMessage(`根据以下职位描述优化我的简历：\n${text}`)
          }
        />
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && input.trim() && sendMessage(input.trim())
            }
            placeholder="描述你的经历..."
            disabled={isStreaming}
            className="flex-1 rounded border px-3 py-2 text-sm disabled:bg-gray-50"
          />
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={!input.trim() || isStreaming}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
