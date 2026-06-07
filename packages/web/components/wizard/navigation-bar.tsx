"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function NavigationBar() {
  const step = useWizardStore((s) => s.step);
  const goNext = useWizardStore((s) => s.goNext);
  const goBack = useWizardStore((s) => s.goBack);
  const checklist = useWizardStore((s) => s.checklist);

  const canGoBack = step !== "chat";
  const allCollected = checklist.every(
    (item) => item.status !== "pending",
  );
  const canGoNext =
    step === "chat"
      ? allCollected
      : step === "editing";

  const stepInfo: Record<string, string> = {
    chat: "步骤 1/4",
    generating: "步骤 2/4",
    editing: "步骤 3/4",
    preview: "步骤 4/4",
  };

  const nextLabel: Record<string, string> = {
    chat: "开始生成",
    editing: "预览导出",
  };

  if (step === "generating") {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 border-t border-slate-200 bg-white px-5 py-3">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
      >
        <ArrowLeft size={15} />
        上一步
      </button>

      <span className="min-w-16 text-center text-xs text-slate-400">
        {stepInfo[step]}
      </span>

      {canGoNext && (
        <button
          onClick={goNext}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          {nextLabel[step]}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
