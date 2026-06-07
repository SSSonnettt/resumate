"use client";
import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function InfoChecklist() {
  const checklist = useWizardStore((s) => s.checklist);
  const markCollected = useWizardStore((s) => s.markCollected);
  const markSkipped = useWizardStore((s) => s.markSkipped);

  const collectedCount = checklist.filter(
    (item) => item.status !== "pending",
  ).length;
  const progressPercent =
    checklist.length > 0
      ? Math.round((collectedCount / checklist.length) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">信息收集清单</h3>
        <p className="mt-1 text-xs text-slate-500">
          逐项提供信息，AI 会引导你完成
        </p>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {checklist.map((item) => (
          <li key={item.key}>
            <button
              onClick={() => {
                if (item.status === "pending") {
                  markCollected(item.key);
                } else if (item.status === "collected") {
                  markSkipped(item.key);
                } else {
                  markCollected(item.key);
                }
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                item.status === "collected"
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : item.status === "skipped"
                    ? "bg-slate-50 text-slate-400 hover:bg-slate-100 line-through"
                    : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.status === "collected" ? (
                <CheckCircle2 size={16} className="shrink-0 text-green-500" />
              ) : item.status === "skipped" ? (
                <MinusCircle size={16} className="shrink-0 text-slate-300" />
              ) : (
                <Circle size={16} className="shrink-0 text-slate-300" />
              )}
              <span className="flex-1">{item.label}</span>
              <span className="text-xs opacity-60">
                {item.status === "collected"
                  ? "已收集"
                  : item.status === "skipped"
                    ? "已跳过"
                    : "待收集"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>收集进度</span>
          <span>
            {collectedCount}/{checklist.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {collectedCount === checklist.length && (
          <p className="mt-3 text-center text-xs font-medium text-green-600">
            ✨ 全部信息已就绪，可以开始生成简历
          </p>
        )}
      </div>
    </div>
  );
}
