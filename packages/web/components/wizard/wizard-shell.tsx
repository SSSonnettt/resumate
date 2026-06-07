"use client";
import { Undo2, Redo2 } from "lucide-react";
import { StepIndicator } from "./step-indicator";
import { NavigationBar } from "./navigation-bar";
import { ChatStep } from "./chat-step";
import { GeneratingStep } from "./generating-step";
import { EditingStep } from "./editing-step";
import { PreviewStep } from "./preview-step";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useResumeStore } from "@/lib/stores/resume-store";

const STEP_LABEL: Record<string, string> = {
  chat: "步骤 1/4 · 聊天收集",
  generating: "步骤 2/4 · AI 生成",
  editing: "步骤 3/4 · 可视化编辑",
  preview: "步骤 4/4 · 预览导出",
};

export function WizardShell() {
  const step = useWizardStore((s) => s.step);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const undoStack = useResumeStore((s) => s.undoStack);
  const redoStack = useResumeStore((s) => s.redoStack);

  const stepContent = (() => {
    switch (step) {
      case "chat":
        return <ChatStep key="chat" />;
      case "generating":
        return <GeneratingStep key="generating" />;
      case "editing":
        return <EditingStep key="editing" />;
      case "preview":
        return <PreviewStep key="preview" />;
    }
  })();

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {/* 顶部导航栏 */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-900">Resumate</span>
          <span className="text-slate-200">|</span>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
            title="撤销"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
            title="重做"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <StepIndicator />

        <div className="w-[160px] text-right text-xs text-slate-400">
          {STEP_LABEL[step]}
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">{stepContent}</div>

      {/* 底部导航 */}
      <NavigationBar />
    </div>
  );
}
