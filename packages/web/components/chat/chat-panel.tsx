"use client";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { MessageBubble } from "./message-bubble";
import { JDInput } from "./jd-input";
import type { HarnessEvent, Resume } from "@ai-resume/shared";

type SSERawEvent =
  | HarnessEvent
  | { type: "stream:done" }
  | { type: "stream:error"; error?: string };

function hasResume(event: SSERawEvent): event is HarnessEvent & { type: "plan:done"; resume: Resume } {
  return event.type === "plan:done" && "resume" in event;
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, addMessage, setStreaming, pushHarnessEvent } =
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

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6)) as SSERawEvent;

            if (data.type !== "stream:done" && data.type !== "stream:error") {
              pushHarnessEvent(data as HarnessEvent);
            }

            if (data.type === "step:chunk") {
              assistantContent += (data as { text: string }).text;
            }
            if (hasResume(data)) {
              applyAIResult(data.resume);
            }
          }
        }
      }
    } catch (err) {
      assistantContent = "抱歉，AI 服务出错了，请重试。";
    } finally {
      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content:
          assistantContent || "简历已生成，请在编辑器中查看和精调。",
        timestamp: Date.now(),
      });
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 你好！我是你的 AI 简历顾问</p>
            <p>
              告诉我你的工作经历、教育背景和技能，我会帮你生成一份专业的简历。
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

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
              e.key === "Enter" && input.trim() && sendMessage(input.trim())
            }
            placeholder="描述你的经历..."
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={() => input.trim() && sendMessage(input.trim())}
            disabled={!input.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
