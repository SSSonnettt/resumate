"use client";
import { useEffect, useRef } from "react";
import { LogStreamView } from "./log-stream-view";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";
import { getProviderConfig } from "@/components/api-key-dialog";
import type { HarnessEvent, Resume } from "@resumate/shared";

type SSERawEvent =
  | HarnessEvent
  | { type: "stream:done" }
  | { type: "stream:error"; error?: string };

function hasResume(
  event: SSERawEvent,
): event is HarnessEvent & { type: "plan:done"; resume: Resume } {
  return event.type === "plan:done" && "resume" in event;
}

export function GeneratingStep() {
  const goNext = useWizardStore((s) => s.goNext);
  const markGenerated = useWizardStore((s) => s.markGenerated);
  const harnessEvents = useChatStore((s) => s.harnessEvents);
  const messages = useChatStore((s) => s.messages);
  const pushHarnessEvent = useChatStore((s) => s.pushHarnessEvent);
  const clearHarnessEvents = useChatStore((s) => s.clearHarnessEvents);
  const applyAIResult = useResumeStore((s) => s.applyAIResult);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  // 步骤2挂载时发起 pipeline 请求
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    clearHarnessEvents();

    async function runPipeline() {
      try {
        const config = getProviderConfig();
        const apiKey =
          config?.apiKey || localStorage.getItem("ai-api-key") || "";

        const requestBody: Record<string, unknown> = {
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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

              if (
                data.type !== "stream:done" &&
                data.type !== "stream:error"
              ) {
                pushHarnessEvent(data as HarnessEvent);
              }

              if (hasResume(data)) {
                applyAIResult(data.resume);
              }
            } catch {
              // 忽略解析失败的 SSE 行
            }
          }
        }
      } catch (err) {
        pushHarnessEvent({
          type: "plan:error",
          stepId: "pipeline",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    runPipeline();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听 plan:done 自动推进
  useEffect(() => {
    if (doneRef.current) return;
    const hasPlanDone = harnessEvents.some((e) => e.type === "plan:done");
    if (hasPlanDone) {
      doneRef.current = true;
      markGenerated();
      const timer = setTimeout(() => goNext(), 1000);
      return () => clearTimeout(timer);
    }
  }, [harnessEvents, goNext, markGenerated]);

  return <LogStreamView />;
}
