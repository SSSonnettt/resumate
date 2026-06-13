"use client";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";
import { Check } from "@phosphor-icons/react";

const STEPS: { key: Step; label: string }[] = [
  { key: "chat", label: "聊天收集" },
  { key: "generating", label: "AI 生成" },
  { key: "editing", label: "可视化编辑" },
  { key: "preview", label: "预览导出" },
];

export function StepIndicator() {
  const step = useWizardStore((s) => s.step);
  const completedSteps = useWizardStore((s) => s.completedSteps);
  const setStep = useWizardStore((s) => s.setStep);

  return (
    <nav
      className="flex items-center gap-0 rounded-full border border-white/[0.08]
                 bg-white/[0.03] px-3 py-2 backdrop-blur-2xl
                 shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]"
      aria-label="步骤进度"
    >
      {STEPS.map((s, index) => {
        const isCurrent = s.key === step;
        const isCompleted = completedSteps.includes(s.key);
        const currentIdx = STEPS.findIndex((s2) => s2.key === step);
        const isAdjacent = Math.abs(index - currentIdx) === 1;
        const isClickable = (isCompleted || isAdjacent) && s.key !== step;
        const isLast = index === STEPS.length - 1;

        return (
          <div key={s.key} className="flex items-center">
            {/* 步骤组件 */}
            <button
              onClick={() => isClickable && setStep(s.key)}
              disabled={!isClickable}
              className={`group flex items-center gap-2 rounded-full px-3 py-1.5
                transition-all duration-500
                ${
                  isCurrent
                    ? "bg-primary/15 text-primary shadow-[0_0_16px_hsl(225_80%_66%/0.2)]"
                    : isCompleted
                      ? "cursor-pointer text-foreground-dim hover:bg-white/[0.06]"
                      : "cursor-default text-foreground-muted"
                }`}
            >
              {/* 步骤编号圆圈 */}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
                  transition-all duration-500
                  ${
                    isCurrent
                      ? "bg-primary text-white"
                      : isCompleted
                        ? "bg-primary/30 text-primary"
                        : "bg-white/[0.08] text-foreground-muted"
                  }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={10} weight="bold" />
                ) : (
                  index + 1
                )}
              </span>
              {/* 标签 */}
              <span className="text-xs font-medium whitespace-nowrap">
                {s.label}
              </span>
            </button>

            {/* 连接线 */}
            {!isLast && (
              <div className="flex items-center px-0.5">
                <div
                  className={`h-px w-6 transition-colors duration-500 ${
                    isCompleted && completedSteps.includes(STEPS[index + 1].key)
                      ? "bg-primary/40"
                      : isCurrent
                        ? "bg-primary/20"
                        : "bg-white/[0.08]"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
