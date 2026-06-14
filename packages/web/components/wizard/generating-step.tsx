"use client";
import { useEffect, useRef, useState } from "react";
import { LogStreamView } from "./log-stream-view";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { getProviderConfig } from "@/components/api-key-dialog";
import { ArrowLeft, CheckCircle, Spinner, ArrowCounterClockwise, Warning, Circle, Stop } from "@phosphor-icons/react";
import type { HarnessEvent, Resume } from "@resumate/shared";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type SSERawEvent =
  | HarnessEvent
  | { type: "stream:done" }
  | { type: "stream:error"; error?: string };

const STAGE_LABELS: Record<string, string> = {
  classify: "正在识别意图...",
  "analyze-jd": "正在分析岗位 JD...",
  collect: "正在整理信息...",
  generate: "正在生成简历...",
  critic: "正在审查简历质量...",
  refine: "正在精修简历...",
  validate: "正在校验结构...",
  present: "即将完成...",
};

function hasResume(
  event: SSERawEvent,
): event is HarnessEvent & { type: "plan:done"; resume: Resume } {
  return event.type === "plan:done" && "resume" in event;
}

/** 动态计算实际触发的阶段数（根据已接收到的 step:start 事件） */
function getActiveStageCount(events: HarnessEvent[]): number {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type === "step:start" && "stepId" in e) {
      seen.add((e as HarnessEvent & { type: "step:start" }).stepId);
    }
  }
  return seen.size || Object.keys(STAGE_LABELS).length;
}

export function GeneratingStep() {
  const goNext = useWizardStore((s) => s.goNext);
  const goBack = useWizardStore((s) => s.goBack);
  const markGenerated = useWizardStore((s) => s.markGenerated);
  const generationCompleted = useWizardStore((s) => s.generationCompleted);
  const markGenerationCompleted = useWizardStore((s) => s.markGenerationCompleted);
  const harnessEvents = useWizardStore((s) => s.wizardHarnessEvents);
  const messages = useWizardStore((s) => s.wizardMessages);
  const fileContents = useWizardStore((s) => s.wizardFileContents);
  const pushHarnessEvent = useWizardStore((s) => s.pushWizardHarnessEvent);
  const clearHarnessEvents = useWizardStore((s) => s.clearWizardHarnessEvents);
  const applyAIResult = useResumeStore((s) => s.applyAIResult);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const hasResumeDataRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>("classify");
  const [retryKey, setRetryKey] = useState(0);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  useEffect(() => {
    if (generationCompleted) {
      startedRef.current = true;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    // 没有用户消息：检查清单可能来自上次持久化，但对话数据已丢失
    const hasUserMessages = messages.some((m) => m.role === "user");
    if (!hasUserMessages) {
      setFatalError("未找到对话信息。请返回聊天步骤输入你的经历后再生成。");
      return;
    }

    clearHarnessEvents();
    hasResumeDataRef.current = false;
    setActiveStage("classify");
    setFatalError(null);
    setPipelineRunning(true);

    async function runPipeline() {
      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const config = getProviderConfig();
        const apiKey =
          config?.apiKey || localStorage.getItem("ai-api-key") || "";

        const requestBody: Record<string, unknown> = {
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          fileContents,
        };

        if (config) {
          requestBody.provider =
            config.provider === "anthropic" ? "anthropic" : "openai-compat";
          requestBody.apiKey = config.apiKey;
          if (config.provider !== "anthropic") {
            requestBody.baseURL = config.baseURL;
            requestBody.model = config.model;
          }
        } else {
          requestBody.provider = "anthropic";
          requestBody.apiKey = apiKey;
        }

        const response = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`服务器错误 (${response.status})`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

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

              if (data.type === "step:start" && "stepId" in data) {
                setActiveStage((data as HarnessEvent & { type: "step:start" }).stepId);
              }

              if (hasResume(data)) {
                applyAIResult(data.resume);
                hasResumeDataRef.current = true;
                markGenerationCompleted();
                // 提取简历名称更新侧边栏会话标题
                const name = data.resume?.data?.basics?.name;
                if (name) {
                  useWizardStore.getState().setConversationName(name);
                }
              }
            } catch {
              // 忽略解析失败的 SSE 行
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setPipelineRunning(false);
          setFatalError("已取消生成。你可以返回聊天补充信息，或重新生成。");
          return;
        }
        const errorMsg = err instanceof Error ? err.message : String(err);
        const lastDone = harnessEvents.findLast(
          (e) => e.type === "step:done" && "result" in e,
        );
        if (lastDone && lastDone.type === "step:done" && lastDone.result) {
          try {
            const partial = lastDone.result as Resume;
            if (partial?.data) {
              applyAIResult(partial);
              hasResumeDataRef.current = true;
              markGenerationCompleted();
            }
          } catch {
            // 无法恢复部分数据
          }
        }
        pushHarnessEvent({
          type: "plan:error",
          stepId: "pipeline",
          error: errorMsg,
        });
      }
    }

    runPipeline();
  }, [retryKey]);

  useEffect(() => {
    if (doneRef.current) return;

    const hasPlanDone = harnessEvents.some((e) => e.type === "plan:done");
    const hasPlanError = harnessEvents.some((e) => e.type === "plan:error");

    if (hasPlanDone && hasResumeDataRef.current) {
      doneRef.current = true;
      setPipelineRunning(false);
      markGenerated();
      const timer = setTimeout(() => goNext(), 1000);
      return () => clearTimeout(timer);
    }

    if (hasPlanError && !hasResumeDataRef.current) {
      doneRef.current = true;
      setPipelineRunning(false);
      markGenerated();
      const lastErr = harnessEvents.findLast((e) => e.type === "plan:error");
      setFatalError(
        lastErr && lastErr.type === "plan:error"
          ? lastErr.error
          : "AI 管线执行异常",
      );
    }

    if (hasPlanError && hasResumeDataRef.current) {
      doneRef.current = true;
      setPipelineRunning(false);
      markGenerated();
      const timer = setTimeout(() => goNext(), 2000);
      return () => clearTimeout(timer);
    }
  }, [harnessEvents, goNext, markGenerated]);

  // ======== 已完成 UI：回访时展示上次生成结果 + 重新生成入口 ========
  if (generationCompleted && !startedRef.current) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden">
          <div className="h-full px-4">
            <ScrollArea className="h-full">
              <LogStreamView harnessEvents={harnessEvents} isStreaming={pipelineRunning} />
            </ScrollArea>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-8 py-4 backdrop-blur-2xl">
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={() => {
                startedRef.current = false;
                doneRef.current = false;
                hasResumeDataRef.current = false;
                clearHarnessEvents();
                setFatalError(null);
                setActiveStage("classify");
                useWizardStore.setState({ generationCompleted: false });
                setRetryKey((k) => k + 1);
              }}
            >
              <ArrowCounterClockwise size={16} weight="light" className="mr-1.5" />
              重新生成
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-foreground-dim">
            重新生成将覆盖当前简历内容
          </p>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-8 py-5 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.06]">
              <CheckCircle size={22} weight="light" className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">简历已生成完成</p>
              <p className="mt-0.5 text-xs text-foreground-dim">
                你可以在编辑器中调整内容，或重新生成一份新简历。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======== 错误 UI：无数据时展示重试/返回按钮 ========
  if (fatalError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/[0.06]">
          <Warning size={32} weight="light" className="text-destructive" />
        </div>
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold">生成未完成</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-dim">{fatalError}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft size={16} weight="light" className="mr-1.5" />
            返回聊天补充信息
          </Button>
          <Button
            onClick={() => {
              startedRef.current = false;
              doneRef.current = false;
              setRetryKey((k) => k + 1);
            }}
          >
            <ArrowCounterClockwise size={16} weight="light" className="mr-1.5" />
            重新生成
          </Button>
        </div>
        <div className="max-h-64 w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.06]">
          <ScrollArea className="h-full max-h-64">
            <LogStreamView harnessEvents={harnessEvents} isStreaming={pipelineRunning} />
          </ScrollArea>
        </div>
      </div>
    );
  }

  // ======== 进行中 UI：分阶段进度 + 可视化日志 ========
  const activeStageCount = getActiveStageCount(harnessEvents);
  const doneSteps = harnessEvents.filter((e) => e.type === "step:done").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="h-full px-4">
          <ScrollArea className="h-full">
            <LogStreamView harnessEvents={harnessEvents} isStreaming={pipelineRunning} />
          </ScrollArea>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.04] bg-white/[0.015] px-8 py-6 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          {!pipelineRunning ? (
            <>
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/[0.03]">
                <Circle size={18} weight="light" className="text-foreground-muted/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground-dim">管线未启动</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  返回聊天步骤提供信息后重新生成
                </p>
              </div>
            </>
          ) : hasResumeDataRef.current ? (
            <>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/[0.06] ring-1 ring-primary/10">
                <CheckCircle size={18} weight="light" className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">简历生成完成</p>
                <p className="mt-0.5 text-xs text-foreground-dim">
                  你可以在编辑器中调整内容
                </p>
              </div>
            </>
          ) : (
            <>
              <Spinner size={18} weight="light" className="animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">AI 正在生成简历</p>
                <p className="mt-0.5 text-xs text-foreground-dim">
                  {STAGE_LABELS[activeStage] ?? "准备中..."}
                </p>
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  abortRef.current?.abort();
                  setPipelineRunning(false);
                }}
                className="shrink-0"
              >
                <Stop size={14} weight="light" className="mr-1" />
                取消
              </Button>
            </>
          )}
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_12px_var(--primary-glow-strong)] transition-all"
            style={{
              width: !pipelineRunning
                ? "0%"
                : hasResumeDataRef.current
                  ? "100%"
                  : `${Math.min((doneSteps / Math.max(activeStageCount, 1)) * 100, 95)}%`,
              transitionDuration: "700ms",
              transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
