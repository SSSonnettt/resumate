"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Spinner, Circle, WarningCircle, Brain, CaretDown, CaretRight, Wrench } from "@phosphor-icons/react";
import type { HarnessEvent } from "@resumate/shared";

const STAGE_LABELS: Record<string, string> = {
  classify: "识别需求",
  "analyze-jd": "分析岗位JD",
  collect: "整理信息",
  generate: "生成简历",
  critic: "审查简历",
  refine: "精修简历",
  validate: "校验结构",
  present: "准备编辑",
};

/** 按管线实际执行顺序排列的所有阶段 */
const STAGE_ORDER = [
  "classify",
  "analyze-jd",
  "collect",
  "generate",
  "critic",
  "refine",
  "validate",
  "present",
];

/** 聚合后的单阶段视图 */
interface StageCard {
  stepId: string;
  description: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  /** 本阶段所有 step:chunk 文本拼接 */
  content: string;
  /** 本阶段所有 reasoning:chunk 文本拼接 */
  reasoning: string;
  /** 本阶段工具调用 */
  toolCalls: { tool: string; args: unknown }[];
  error?: string;
  skipReason?: string;
}

function buildStageCards(events: HarnessEvent[]): StageCard[] {
  // 按 stepId 分组
  const groups: Record<
    string,
    {
      description: string;
      done: boolean;
      error?: string;
      skipped?: string;
      contentChunks: string[];
      reasoningChunks: string[];
      toolCalls: { tool: string; args: unknown }[];
    }
  > = {};

  for (const e of events) {
    const sid = (e as { stepId?: string }).stepId;
    if (!sid) continue;

    if (!groups[sid]) {
      groups[sid] = {
        description: "",
        done: false,
        contentChunks: [],
        reasoningChunks: [],
        toolCalls: [],
      };
    }

    switch (e.type) {
      case "step:start":
        groups[sid].description = (e as typeof e & { description: string }).description;
        break;
      case "step:chunk":
        groups[sid].contentChunks.push((e as typeof e & { text: string }).text);
        break;
      case "reasoning:chunk":
        groups[sid].reasoningChunks.push((e as typeof e & { text: string }).text);
        break;
      case "step:tool_call":
        groups[sid].toolCalls.push({
          tool: (e as typeof e & { tool: string }).tool,
          args: (e as typeof e & { args: unknown }).args,
        });
        break;
      case "step:done":
        groups[sid].done = true;
        break;
      case "step:skipped":
        groups[sid].skipped = (e as typeof e & { reason: string }).reason;
        groups[sid].done = true;
        break;
      case "step:retry":
        // 重试表示仍在进行中
        groups[sid].done = false;
        break;
    }
  }

  // plan:error 可能关联某个 stepId
  const planError = events.find((e) => e.type === "plan:error") as
    | (HarnessEvent & { type: "plan:error"; stepId: string; error: string })
    | undefined;

  // 找出当前正运行的 stageId（有 step:start 但无 step:done）
  const completedIds = new Set(
    events.filter((e) => e.type === "step:done").map((e) => (e as { stepId: string }).stepId),
  );
  const startedIds = events
    .filter((e) => e.type === "step:start")
    .map((e) => (e as { stepId: string }).stepId);

  const runningId = startedIds.findLast((id) => !completedIds.has(id));

  return STAGE_ORDER.map((stepId) => {
    const g = groups[stepId];
    if (!g) {
      return {
        stepId,
        description: "",
        status: "pending" as const,
        content: "",
        reasoning: "",
        toolCalls: [],
      };
    }

    const hasPlanError = planError && planError.stepId === stepId;
    const isDone = g.done || !!g.skipped;

    let status: StageCard["status"];
    if (g.skipped) status = "skipped";
    else if (hasPlanError) status = "error";
    else if (isDone) status = "done";
    else if (stepId === runningId) status = "running";
    else status = "pending";

    return {
      stepId,
      description: g.description,
      status,
      content: g.contentChunks.join(""),
      reasoning: g.reasoningChunks.join(""),
      toolCalls: g.toolCalls,
      error: hasPlanError ? planError.error : undefined,
      skipReason: g.skipped,
    };
  });
}

export function LogStreamView({
  harnessEvents,
  isStreaming = false,
}: {
  harnessEvents: HarnessEvent[];
  isStreaming?: boolean;
}) {
  // 跟踪用户手动切换过的面板展开状态
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const stages = useMemo(() => buildStageCards(harnessEvents), [harnessEvents]);

  // 自动滚动到当前运行中的阶段
  useEffect(() => {
    const currentStage = stages.find((s) => s.status === "running");
    if (currentStage) {
      const el = document.getElementById(`stage-${currentStage.stepId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [stages]);

  // plan 级别错误（不绑定特定 stepId）
  const planError = harnessEvents.find((e) => e.type === "plan:error") as
    | (HarnessEvent & { type: "plan:error"; error: string })
    | undefined;

  const hasAnyContent = stages.some(
    (s) => s.content || s.reasoning || s.toolCalls.length > 0 || s.status !== "pending",
  );

  const toggleReasoning = (stepId: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  /** 判断阶段面板是否展开 */
  const getStageExpanded = (stepId: string, status: StageCard["status"]) => {
    if (stepId in manualExpanded) return manualExpanded[stepId]!;
    // 默认：running 展开，其他收起
    return status === "running";
  };

  const toggleStage = (stepId: string) => {
    setManualExpanded((prev) => ({
      ...prev,
      [stepId]: !(stepId in prev ? prev[stepId] : getDefaultExpanded(stepId)),
    }));
  };

  const getDefaultExpanded = (stepId: string) => {
    const stage = stages.find((s) => s.stepId === stepId);
    return stage?.status === "running";
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4">
      {/* 空状态 */}
      {!hasAnyContent && isStreaming && (
        <div className="flex items-center gap-2 border border-[hsl(var(--divider-strong))] bg-card p-4 text-sm text-foreground-dim">
          <Spinner size={14} weight="light" className="animate-spin" />
          AI Agent 启动中...
        </div>
      )}

      {/* 按顺序渲染每个阶段 */}
      {stages
        .filter((s) => {
          if (s.status !== "pending") return true;
          // pending 阶段：有活跃阶段时只显示活跃阶段附近，无活跃时显示全部
          const activeIdx = stages.findIndex((x) => x.status === "running" || x.status === "done");
          if (activeIdx === -1) return true;
          return STAGE_ORDER.indexOf(s.stepId) <= activeIdx + 2;
        })
        .map((stage) => (
          <StageCardNode
            key={stage.stepId}
            stage={stage}
            reasoningExpanded={!!expandedReasoning[stage.stepId]}
            onToggleReasoning={() => toggleReasoning(stage.stepId)}
            panelExpanded={getStageExpanded(stage.stepId, stage.status)}
            onTogglePanel={() => toggleStage(stage.stepId)}
          />
        ))}

      {/* plan 级别错误横幅 */}
      {planError && (
        <div className="flex items-start gap-2 border border-destructive/20 bg-destructive/[0.04] p-4">
          <WarningCircle size={16} weight="light" className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">生成失败</p>
            <p className="mt-0.5 text-sm text-destructive/80">{planError.error}</p>
          </div>
        </div>
      )}

    </div>
  );
}

// ======== 单阶段卡片 ========
function StageCardNode({
  stage,
  reasoningExpanded,
  onToggleReasoning,
  panelExpanded,
  onTogglePanel,
}: {
  stage: StageCard;
  reasoningExpanded: boolean;
  onToggleReasoning: () => void;
  panelExpanded: boolean;
  onTogglePanel: () => void;
}) {
  const label = STAGE_LABELS[stage.stepId] || stage.stepId;
  const isEmpty = !stage.content && !stage.reasoning && stage.toolCalls.length === 0;
  const hasContent = stage.content || stage.reasoning || stage.toolCalls.length > 0;

  // 跳过：无任何内容且已完成（避免显示空白卡片）
  if (stage.status === "done" && isEmpty) return null;

  return (
    <div
      id={`stage-${stage.stepId}`}
      className={`border transition-colors ${
        stage.status === "running"
          ? "border-primary/25 bg-primary/[0.04]"
          : stage.status === "done"
            ? "border-[hsl(var(--divider-strong))] bg-card"
            : stage.status === "error"
              ? "border-destructive/20 bg-destructive/[0.04]"
              : stage.status === "skipped"
                ? "border-[hsl(var(--divider))] bg-card"
                : "border-[hsl(var(--divider))] bg-card"
      }`}
    >
      {/* 阶段头部 — 可点击切换展开/收起 */}
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        {/* 状态图标 */}
        {stage.status === "running" ? (
          <Spinner size={16} weight="light" className="shrink-0 animate-spin text-primary" />
        ) : stage.status === "done" ? (
          <CheckCircle size={16} weight="light" className="shrink-0 text-primary" />
        ) : stage.status === "error" ? (
          <WarningCircle size={16} weight="light" className="shrink-0 text-destructive" />
        ) : stage.status === "skipped" ? (
          <Circle size={16} weight="light" className="shrink-0 text-foreground-muted/25" />
        ) : (
          <Circle size={16} weight="light" className="shrink-0 text-foreground-muted/25" />
        )}

        {/* 阶段名称 */}
        <span
          className={`text-sm font-medium ${
            stage.status === "running"
              ? "text-primary"
              : stage.status === "done"
                ? "text-foreground"
                : stage.status === "error"
                  ? "text-destructive"
                  : "text-foreground-dim"
          }`}
        >
          {label}
        </span>

        {/* 描述文本 */}
        {stage.description && (
          <span className="text-xs text-foreground-dim/50">— {stage.description}</span>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          {/* 跳过原因 */}
          {stage.status === "skipped" && stage.skipReason && (
            <span className="text-xs text-foreground-dim/50">{stage.skipReason}</span>
          )}

          {/* 工具调用计数 */}
          {stage.toolCalls.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-foreground-dim">
              <Wrench size={10} weight="light" />
              {stage.toolCalls.length}
            </span>
          )}

          {/* 展开/收起指示 */}
          {hasContent && (
            <CaretDown
              size={14}
              weight="light"
              className={`shrink-0 text-foreground-dim transition-transform duration-200 ${
                panelExpanded ? "" : "-rotate-90"
              }`}
            />
          )}
        </span>
      </button>

      {/* 卡片内容：仅展开时显示 */}
      {hasContent && panelExpanded && (
        <div className="border-t border-[hsl(var(--divider-strong))] px-4 py-3">
          {/* 展开/折叠 reasoning 按钮 */}
          {stage.reasoning && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleReasoning(); }}
              className="mb-3 flex items-center gap-1 px-1.5 py-0.5 text-xs text-foreground-dim transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Brain size={12} weight="light" />
              {reasoningExpanded ? "收起思考" : "展开思考"}
              {reasoningExpanded ? <CaretDown size={10} weight="light" /> : <CaretRight size={10} weight="light" />}
            </button>
          )}
          {/* 思考过程 — 可折叠 */}
          {stage.reasoning && reasoningExpanded && (
            <div className="mb-3 border border-primary/10 bg-primary/[0.03] p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-primary/80">
                <Brain size={12} weight="light" />
                思考过程
              </div>
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground-dim">
                {stage.reasoning}
              </pre>
            </div>
          )}

          {/* 工具调用列表 */}
          {stage.toolCalls.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {stage.toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="border border-foreground/10 bg-foreground/[0.04] px-3 py-2"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                    <Wrench size={10} weight="light" />
                    调用工具: {tc.tool}
                  </div>
                  <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-foreground-muted/60 opacity-80">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* 生成文本内容 */}
          {stage.content && (
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
              {stage.content}
            </pre>
          )}

          {/* 错误信息 */}
          {stage.status === "error" && stage.error && (
            <p className="mt-2 text-xs text-destructive/80">{stage.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
