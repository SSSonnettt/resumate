"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { getProviderConfig } from "@/components/api-key-dialog";
import type { HarnessEvent, Resume } from "@resumate/shared";

type SSERawEvent =
  | HarnessEvent
  | { type: "stream:done" }
  | { type: "stream:error"; error?: string };

const guidedPrompts = [
  {
    label: "目标岗位 JD",
    placeholder: "粘贴岗位职责、任职要求、加分项...",
  },
  {
    label: "个人经历",
    placeholder: "写下你的工作经历、项目、教育背景、技能关键词...",
  },
  {
    label: "生成要求",
    placeholder: "例如：偏产品经理、突出 B 端增长、控制在一页...",
  },
];

function hasResume(
  event: SSERawEvent,
): event is HarnessEvent & { type: "plan:done"; resume: Resume } {
  return event.type === "plan:done" && "resume" in event;
}

interface ChatPanelProps {
  variant?: "standalone" | "wizard";
  onGenerate?: () => void;
}

export function ChatPanel({ variant = "standalone", onGenerate }: ChatPanelProps) {
  const [drafts, setDrafts] = useState(() => guidedPrompts.map(() => ""));
  const [wizardInput, setWizardInput] = useState("");
  const { messages, addMessage, setStreaming, isStreaming, pushHarnessEvent, clearHarnessEvents } =
    useChatStore();
  const { applyAIResult } = useResumeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const completion = useMemo(() => {
    const done = drafts.filter((item) => item.trim()).length;
    return Math.round((done / guidedPrompts.length) * 100);
  }, [drafts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function submitMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    clearHarnessEvents();
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setStreaming(true);

    const assistantMsgId = crypto.randomUUID();
    let assistantContent = "";
    let hasError = false;
    let hasResumeResult = false;

    try {
      const config = getProviderConfig();
      const apiKey = config?.apiKey || localStorage.getItem("ai-api-key") || "";

      const requestBody: Record<string, unknown> = {
        messages: [...messages, userMsg].map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };

      if (config) {
        requestBody.provider = config.provider === "anthropic" ? "anthropic" : "openai-compat";
        requestBody.apiKey = config.apiKey;
        if (config.provider !== "anthropic") {
          requestBody.baseURL = config.baseURL;
          requestBody.model = config.model;
        }
      } else {
        requestBody.provider = "anthropic";
        requestBody.apiKey = apiKey;
      }

      const endpoint = variant === "wizard" ? "/api/agent/chat" : "/api/agent/run";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

            if (data.type !== "stream:done" && data.type !== "stream:error") {
              pushHarnessEvent(data as HarnessEvent);
            }

            if (data.type === "step:chunk") {
              assistantContent += data.text;
            }

            if (
              data.type === "step:done" &&
              data.stepId === "collect" &&
              data.result &&
              typeof (data.result as Record<string, unknown>).text === "string"
            ) {
              assistantContent = (data.result as { text: string }).text;
            }

            if (hasResume(data)) {
              applyAIResult(data.resume);
              hasResumeResult = true;
              onGenerate?.();
            }

            if (data.type === "plan:error") {
              hasError = true;
              assistantContent = `AI 处理出错：${data.error}`;
            }
          } catch {
            // Ignore malformed SSE rows.
          }
        }
      }
    } catch (err) {
      hasError = true;
      assistantContent = `请求失败：${err instanceof Error ? err.message : String(err)}`;
    } finally {
      const finalContent = resolveFinalAssistantContent({
        hasError,
        hasResumeResult,
        assistantContent,
      });
      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: finalContent,
        timestamp: Date.now(),
      });
      setStreaming(false);
    }
  }

  async function submitWorkbench() {
    const content = formatGuidedInput(drafts);
    await submitMessage(content);
  }

  async function handleWizardSubmit(e: FormEvent) {
    e.preventDefault();
    const content = wizardInput.trim();
    if (!content) return;
    setWizardInput("");
    await submitMessage(content);
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {variant === "standalone" && (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <p className="text-xs font-medium text-slate-400">AI Resume Studio</p>
            <h1 className="text-base font-semibold text-slate-950">JD 定制中文简历</h1>
          </div>
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            编辑器
            <ArrowRight size={15} />
          </Link>
        </header>
      )}

      <div className="grid flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        {variant === "standalone" && (
        <section className="border-b border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Sparkles size={16} className="text-blue-600" />
              结构化生成向导
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              {completion}% 已填写
            </span>
          </div>
          <div className="space-y-3">
            {guidedPrompts.map((prompt, index) => (
              <label key={prompt.label} className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                  {index === 0 && <BriefcaseBusiness size={13} />}
                  {index === 1 && <FileText size={13} />}
                  {index === 2 && <CheckCircle2 size={13} />}
                  {prompt.label}
                </span>
                <textarea
                  value={drafts[index]}
                  onChange={(event) => {
                    const next = drafts.slice();
                    next[index] = event.target.value;
                    setDrafts(next);
                  }}
                  placeholder={prompt.placeholder}
                  rows={index === 0 ? 4 : 3}
                  className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">
              原型阶段会用你本地保存的 API Key 调用模型，不上传到数据库。
            </p>
            <Button
              variant="primary"
              onClick={submitWorkbench}
              disabled={isStreaming || !drafts.some((item) => item.trim())}
            >
              {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              生成定制简历
            </Button>
          </div>
        </section>
        )}

        <section className="overflow-y-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">AI 工作记录</h2>
            <span className="text-xs text-slate-400">{messages.length} 条消息</span>
          </div>
          {messages.length === 0 && !isStreaming && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-5 py-8 text-center">
              {variant === "wizard" ? (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    👋 你好！我是你的求职简历顾问
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    我会逐步引导你提供信息——从基本信息、工作经历到技能和项目。
                    <br />
                    你可以粘贴 JD 让我了解目标岗位要求，也可以随时回复"跳过"。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    先把 JD 和经历放进上方表单。
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    AI
                    会先确认关键信息，再生成一份可编辑、可导出 PDF 的中文简历。
                  </p>
                </>
              )}
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && (
            <div className="mb-4 flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                <Loader2 size={15} className="animate-spin" />
                AI 正在整理简历结构...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        {variant === "wizard" && !isStreaming && (
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleWizardSubmit} className="flex gap-2">
              <textarea
                value={wizardInput}
                onChange={(e) => setWizardInput(e.target.value)}
                placeholder="输入你的经历信息..."
                rows={2}
                className="flex-1 resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400 focus:bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleWizardSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!wizardInput.trim() || isStreaming}
                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                发送
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function formatGuidedInput(drafts: string[]) {
  return guidedPrompts
    .map((prompt, index) => `【${prompt.label}】\n${drafts[index]?.trim() || "未提供"}`)
    .join("\n\n");
}

function resolveFinalAssistantContent({
  hasError,
  hasResumeResult,
  assistantContent,
}: {
  hasError: boolean;
  hasResumeResult: boolean;
  assistantContent: string;
}) {
  if (hasError) return assistantContent || "AI 服务出错了，请重试。";
  if (hasResumeResult) {
    return assistantContent || "简历已生成。你可以进入编辑器做模块级调整，然后导出 PDF。";
  }
  return assistantContent || "我还需要更多信息才能生成简历。";
}
