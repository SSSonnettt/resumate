"use client";
import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { HarnessEvent } from "@resumate/shared";

const STAGE_LABELS: Record<string, string> = {
  classify: "识别需求",
  collect: "整理信息",
  generate: "生成简历",
  validate: "校验结构",
  present: "准备编辑",
};

const STAGE_ORDER = ["classify", "collect", "generate", "validate", "present"];

export function LogStreamView() {
  const harnessEvents = useChatStore((s) => s.harnessEvents);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  const completedStages = new Set(
    harnessEvents
      .filter((e) => e.type === "step:done")
      .map((e) => e.stepId),
  );

  const startedStages = harnessEvents
    .filter((e) => e.type === "step:start")
    .map((e) => e.stepId);

  const currentStage = startedStages
    .filter((id) => !completedStages.has(id))
    .at(-1);

  const errorEvent = harnessEvents.find(
    (e) => e.type === "plan:error",
  ) as (HarnessEvent & { type: "plan:error" }) | undefined;

  const events = harnessEvents.filter((e) => e.type !== "step:chunk");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      {/* 阶段进度 */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
        {STAGE_ORDER.map((stageId) => {
          const done = completedStages.has(stageId);
          const current = stageId === currentStage;
          return (
            <span
              key={stageId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                done
                  ? "bg-green-50 text-green-700"
                  : current
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? (
                <CheckCircle2 size={12} />
              ) : current ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Circle size={12} />
              )}
              {STAGE_LABELS[stageId] || stageId}
            </span>
          );
        })}
      </div>

      {/* 日志流 */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 font-mono text-sm leading-relaxed text-slate-700">
        {harnessEvents.length === 0 && isStreaming && (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            🤖 AI Agent 启动中...
          </div>
        )}

        {events.map((event, index) => (
          <div key={index} className="mb-2">
            {event.type === "plan:start" && (
              <div className="text-slate-400">
                🚀 启动 Plan: {event.planId}
              </div>
            )}
            {event.type === "step:start" && (
              <div className="text-blue-600">
                🔄 开始: {STAGE_LABELS[event.stepId] || event.stepId}
              </div>
            )}
            {event.type === "step:done" && (
              <div className="text-green-600">
                ✅ 完成: {STAGE_LABELS[event.stepId] || event.stepId}
              </div>
            )}
            {event.type === "plan:error" && (
              <div className="rounded bg-red-50 p-2 text-red-700">
                <AlertCircle size={14} className="inline" /> 错误:{" "}
                {errorEvent?.error || "未知错误"}
              </div>
            )}
          </div>
        ))}

        {errorEvent && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle size={16} />
              生成失败
            </div>
            <p className="mt-1 text-sm text-red-600">
              {errorEvent.error || "未知错误，请重试或返回上一步补充信息"}
            </p>
          </div>
        )}

        {isStreaming && (
          <div className="mt-2 flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            生成中...
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
