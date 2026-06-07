"use client";
import { motion } from "framer-motion";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "chat", label: "聊天收集", icon: "💬" },
  { key: "generating", label: "AI 生成", icon: "⚙️" },
  { key: "editing", label: "可视化编辑", icon: "✏️" },
  { key: "preview", label: "预览导出", icon: "📄" },
];

export function StepIndicator() {
  const step = useWizardStore((s) => s.step);
  const completedSteps = useWizardStore((s) => s.completedSteps);
  const setStep = useWizardStore((s) => s.setStep);

  return (
    <nav
      className="flex items-center justify-center gap-0"
      aria-label="步骤进度"
    >
      {STEPS.map((s, index) => {
        const isCurrent = s.key === step;
        const isCompleted = completedSteps.includes(s.key);
        const isClickable = isCompleted && s.key !== step;

        return (
          <div key={s.key} className="flex items-center">
            {index > 0 && (
              <div
                className={`mx-2 h-0.5 w-8 rounded transition-colors ${
                  isCompleted || isCurrent ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            )}
            <button
              onClick={() => isClickable && setStep(s.key)}
              disabled={!isClickable}
              className={`relative flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white shadow-md"
                  : isCompleted
                    ? "cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "cursor-default bg-slate-100 text-slate-400"
              }`}
            >
              {isCurrent && (
                <motion.div
                  layoutId="step-indicator"
                  className="absolute inset-0 rounded-full bg-blue-600"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{s.icon}</span>
              <span className="relative z-10 hidden sm:inline">{s.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
