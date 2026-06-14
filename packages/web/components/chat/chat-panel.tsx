"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowElbowDownRight, Briefcase, CheckCircle, FileText, Spinner, Paperclip, Sparkle, HandWaving } from "@phosphor-icons/react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { getProviderConfig } from "@/components/api-key-dialog";
import type { FileAttachment, HarnessEvent, Resume } from "@resumate/shared";

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

/** 从文本中提取并移除 checklist JSON 块 */
function extractChecklist(text: string): { cleanedText: string; checklist: Record<string, string> | null } {
  const match = text.match(/<!--checklist-->\s*(\{[\s\S]*?\})\s*<!--\/checklist-->/);
  if (!match) return { cleanedText: text, checklist: null };

  try {
    const checklist = JSON.parse(match[1]!);
    const cleanedText = text.replace(match[0], "").trim();
    return { cleanedText, checklist };
  } catch {
    return { cleanedText: text, checklist: null };
  }
}

/** 根据 checklist JSON 自动更新 WizardStore */
function applyChecklistToStore(checklist: Record<string, string>) {
  const { markCollected, markSkipped } = useWizardStore.getState();
  for (const [key, status] of Object.entries(checklist)) {
    if (status === "collected") {
      markCollected(key);
    } else if (status === "skipped") {
      markSkipped(key);
    }
  }
}

export function ChatPanel({ variant = "standalone", onGenerate }: ChatPanelProps) {
  const [drafts, setDrafts] = useState(() => guidedPrompts.map(() => ""));
  const [wizardInput, setWizardInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 待发送的文件内容（不在 UI 中展示长文本，仅随 API 请求发送）
  const pendingFileContentsRef = useRef<string[]>([]);
  // 待发送的文件附件元数据（用于消息气泡展开查看）
  const pendingAttachmentsRef = useRef<FileAttachment[]>([]);

  // 已处理过的 checklist key，避免重复标记
  const processedChecklistRef = useRef<Set<string>>(new Set());

  // 流式过程中的临时状态
  const [streamingText, setStreamingText] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");

  // Wizard 模式使用独立 store；standalone 模式使用全局 chat-store
  const chatMessages = useChatStore((s) => s.messages);
  const chatStreaming = useChatStore((s) => s.isStreaming);
  const chatAddMessage = useChatStore((s) => s.addMessage);
  const chatSetStreaming = useChatStore((s) => s.setStreaming);
  const chatPushHarnessEvent = useChatStore((s) => s.pushHarnessEvent);
  const chatClearHarnessEvents = useChatStore((s) => s.clearHarnessEvents);

  const wizardMessages = useWizardStore((s) => s.wizardMessages);
  const wizardStreaming = useWizardStore((s) => s.wizardStreaming);
  const wizardAddMessage = useWizardStore((s) => s.addWizardMessage);
  const wizardSetStreaming = useWizardStore((s) => s.setWizardStreaming);
  const wizardPushHarnessEvent = useWizardStore((s) => s.pushWizardHarnessEvent);
  const wizardClearHarnessEvents = useWizardStore((s) => s.clearWizardHarnessEvents);

  const messages = variant === "wizard" ? wizardMessages : chatMessages;
  const isStreaming = variant === "wizard" ? wizardStreaming : chatStreaming;
  const addMessage = variant === "wizard" ? wizardAddMessage : chatAddMessage;
  const setStoreStreaming = variant === "wizard" ? wizardSetStreaming : chatSetStreaming;
  const pushHarnessEvent = variant === "wizard" ? wizardPushHarnessEvent : chatPushHarnessEvent;
  const clearHarnessEvents = variant === "wizard" ? wizardClearHarnessEvents : chatClearHarnessEvents;

  const { applyAIResult } = useResumeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const completion = useMemo(() => {
    const done = drafts.filter((item) => item.trim()).length;
    return Math.round((done / guidedPrompts.length) * 100);
  }, [drafts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, streamingText]);

  /** 增量解析流式文本中的 checklist 标记，实时更新清单状态 */
  function tryApplyIncrementalChecklist(text: string) {
    const match = text.match(/<!--checklist-->\s*(\{[\s\S]*?\})\s*<!--\/checklist-->/);
    if (!match) return;
    try {
      const checklist = JSON.parse(match[1]!) as Record<string, string>;
      const { markCollected, markSkipped } = useWizardStore.getState();
      for (const [key, status] of Object.entries(checklist)) {
        if (processedChecklistRef.current.has(key)) continue;
        processedChecklistRef.current.add(key);
        if (status === "collected") {
          markCollected(key);
        } else if (status === "skipped") {
          markSkipped(key);
        }
      }
    } catch {
      // JSON 尚未完整，等待更多 chunk
    }
  }

  async function submitMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    clearHarnessEvents();
    setStreamingText("");
    setStreamingReasoning("");
    processedChecklistRef.current = new Set();

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content,
      timestamp: Date.now(),
      attachments:
        pendingAttachmentsRef.current.length > 0
          ? [...pendingAttachmentsRef.current]
          : undefined,
    };
    pendingAttachmentsRef.current = [];
    addMessage(userMsg);
    setStoreStreaming(true);

    const assistantMsgId = crypto.randomUUID();
    let assistantContent = "";
    let assistantReasoning = "";
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

      // Wizard 模式：附带已上传文件内容（仅供 API 使用，不在 UI 中展示长文本）
      if (variant === "wizard" && pendingFileContentsRef.current.length > 0) {
        requestBody.fileContents = pendingFileContentsRef.current;
        pendingFileContentsRef.current = [];
      }

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

            if (data.type === "reasoning:chunk") {
              assistantReasoning += data.text;
              setStreamingReasoning(assistantReasoning);
            }

            if (data.type === "step:chunk") {
              assistantContent += data.text;
              setStreamingText(assistantContent);
              // 增量解析 checklist 并实时更新清单
              if (variant === "wizard") {
                tryApplyIncrementalChecklist(assistantContent);
              }
            }

            if (
              data.type === "step:done" &&
              data.stepId === "collect" &&
              data.result &&
              typeof (data.result as Record<string, unknown>).text === "string"
            ) {
              assistantContent = (data.result as { text: string }).text;
            }

            if (data.type === "step:done" && data.stepId === "chat") {
              const result = data.result as { text?: string; reasoning?: string } | undefined;
              if (result?.text) assistantContent = result.text;
              if (result?.reasoning) assistantReasoning = result.reasoning;
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
      const { cleanedText, checklist } = extractChecklist(assistantContent);

      if (variant === "wizard" && checklist) {
        applyChecklistToStore(checklist);
      }

      const finalContent = resolveFinalAssistantContent({
        hasError,
        hasResumeResult,
        assistantContent: variant === "wizard" ? cleanedText : assistantContent,
      });

      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: finalContent,
        timestamp: Date.now(),
        reasoningContent: assistantReasoning || undefined,
      });
      setStoreStreaming(false);
      setStreamingText("");
      setStreamingReasoning("");
    }
  }

  async function submitWorkbench() {
    const content = formatGuidedInput(drafts);
    await submitMessage(content);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    e.target.value = "";

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "上传失败" }));
        await submitMessage(`[文件上传失败：${err.error || "未知错误"}]`);
        return;
      }

      const data = (await res.json()) as {
        text: string;
        fileName: string;
        truncated?: boolean;
      };

      const content = `📎 已上传文件：${data.fileName}（已提取 ${data.text.length} 字符，内容已发送给 AI 分析）`;

      // 将文件全文存入待发送队列，不在 UI 中展示
      pendingFileContentsRef.current.push(data.text);
      // 同时持久化到 wizard store，确保生成步骤可获取原始文件内容
      if (variant === "wizard") {
        useWizardStore.getState().addWizardFileContents([data.text]);
      }
      // 存储附件元数据，供消息气泡展开查看
      pendingAttachmentsRef.current.push({
        fileName: data.fileName,
        charCount: data.text.length,
        content: data.text,
      });

      await submitMessage(content);
    } catch (err) {
      await submitMessage(
        `[文件上传失败：${err instanceof Error ? err.message : "网络错误"}]`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleWizardSubmit(e: FormEvent) {
    e.preventDefault();
    const content = wizardInput.trim();
    if (!content) return;
    setWizardInput("");
    await submitMessage(content);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {variant === "standalone" && (
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.04] px-5 py-3.5">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-foreground-muted/50">
              AI Resume Studio
            </p>
            <h1 className="text-base font-semibold tracking-tight">
              JD 定制中文简历
            </h1>
          </div>
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground
                       shadow-[0_0_16px_var(--primary-glow)]
                       transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                       hover:shadow-[0_0_24px_var(--primary-glow)] active:scale-[0.97]"
          >
            编辑器
            <ArrowElbowDownRight size={15} weight="light" />
          </Link>
        </header>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {variant === "standalone" && (
          <section className="shrink-0 border-b border-white/[0.04] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <Sparkle size={15} weight="light" className="text-primary" />
                结构化生成向导
              </div>
              <span className="rounded-full border border-primary/[0.08] bg-primary/[0.04] px-2.5 py-1 text-[11px] font-medium tabular-nums text-primary">
                {completion}% 已填写
              </span>
            </div>
            <div className="space-y-3">
              {guidedPrompts.map((prompt, index) => (
                <label key={prompt.label} className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-[11px] font-medium tracking-wide text-foreground-dim/60">
                    {index === 0 && <Briefcase size={12} weight="light" />}
                    {index === 1 && <FileText size={12} weight="light" />}
                    {index === 2 && <CheckCircle size={12} weight="light" />}
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
                    className="w-full resize-none rounded-xl border border-white/[0.04] bg-white/[0.015] px-3.5 py-2.5 text-sm leading-6 text-foreground outline-none transition-all duration-300 placeholder:text-foreground-muted/25 focus:border-primary/20 focus:bg-white/[0.025] focus:shadow-[0_0_0_3px_var(--primary-glow)]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-foreground-muted/40">
                原型阶段会用你本地保存的 API Key 调用模型，不上传到数据库。
              </p>
              <Button
                onClick={submitWorkbench}
                disabled={isStreaming || !drafts.some((item) => item.trim())}
              >
                {isStreaming ? <Spinner size={15} weight="light" className="animate-spin" /> : <Sparkle size={15} weight="light" />}
                生成定制简历
              </Button>
            </div>
          </section>
        )}

        {/* 消息列表 */}
        <section className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 && !isStreaming && (
              <div className="rounded-2xl border border-white/[0.03] bg-white/[0.005] px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                {variant === "wizard" ? (
                  <>
                    <p className="text-sm font-semibold tracking-tight text-foreground/90">
                      <HandWaving size={15} weight="light" className="mr-1.5 inline-block text-primary/80" />
                      你好，我是你的求职简历顾问
                    </p>
                    <p className="mt-2.5 text-[13px] leading-6 text-foreground-dim/60">
                      我会逐步引导你提供信息——从基本信息、工作经历到技能和项目。
                      <br />
                      你可以粘贴 JD 让我了解目标岗位要求，也可以随时回复「跳过」跳过不需要的部分。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold tracking-tight text-foreground/90">
                      先把 JD 和经历放进上方表单
                    </p>
                    <p className="mt-2.5 text-[13px] leading-6 text-foreground-dim/60">
                      AI 会先确认关键信息，再生成一份可编辑、可导出 PDF 的中文简历。
                    </p>
                  </>
                )}
              </div>
            )}
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                reasoningContent={message.reasoningContent}
                attachments={message.attachments}
                revealDelay={index * 50}
              />
            ))}
            {/* 流式过程中的临时消息气泡 */}
            {isStreaming && streamingText && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingText,
                  timestamp: Date.now(),
                }}
                reasoningContent={streamingReasoning || undefined}
              />
            )}
            {isStreaming && !streamingText && (
              <div className="mb-4 flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.03] bg-white/[0.005] px-4 py-2.5 text-[13px] text-foreground-dim/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.01)]">
                  <Spinner size={13} weight="light" className="animate-spin text-primary/50" />
                  AI 正在思考…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        {/* wizard 模式底部输入框 · Double-Bezel 玻璃药丸 */}
        {variant === "wizard" && !isStreaming && (
          <div className="shrink-0 px-3 pb-3 pt-1">
            <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-white/[0.04] bg-white/[0.008] p-[3px] shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-2xl">
              <form onSubmit={handleWizardSubmit} className="flex items-end gap-2 rounded-[calc(1.5rem-3px)] border border-white/[0.03] bg-[hsl(240,8%,4%)] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <label
                  className={`group shrink-0 cursor-pointer rounded-lg p-1.5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isUploading
                      ? "cursor-not-allowed opacity-30"
                      : "text-foreground-muted/30 hover:bg-white/[0.04] hover:text-foreground-dim/70"
                  }`}
                  title="上传简历或 JD 文件（PDF/Word/TXT）"
                >
                  {isUploading ? (
                    <Spinner size={14} weight="light" className="animate-spin" />
                  ) : (
                    <Paperclip size={14} weight="light" />
                  )}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <textarea
                  value={wizardInput}
                  onChange={(e) => setWizardInput(e.target.value)}
                  placeholder="描述你的经历，或粘贴简历文件…"
                  rows={3}
                  className="flex-1 resize-none rounded-xl border border-white/[0.03] bg-transparent px-3 py-2 text-[13px] leading-relaxed outline-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-foreground-muted/20 focus:border-primary/12 focus:bg-white/[0.01] disabled:cursor-not-allowed disabled:opacity-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleWizardSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  disabled={isUploading}
                />
                <Button
                  type="submit"
                  disabled={!wizardInput.trim() || isStreaming || isUploading}
                  size="default"
                >
                  发送
                </Button>
              </form>
            </div>
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
