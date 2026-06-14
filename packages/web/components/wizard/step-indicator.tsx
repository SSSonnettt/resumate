"use client";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";
import { Check } from "@phosphor-icons/react";

const STEPS: { key: Step; label: string }[] = [
  { key: "chat", label: "聊天收集" },
  { key: "generating", label: "AI 生成" },
  { key: "editing", label: "可视化编辑" },
];

export function StepIndicator() {
  const step = useWizardStore((s) => s.step);
  const completedSteps = useWizardStore((s) => s.completedSteps);
  const setStep = useWizardStore((s) => s.setStep);

  return (
    <nav
      className="inline-flex items-center gap-0"
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
            <button
              onClick={() => isClickable && setStep(s.key)}
              disabled={!isClickable}
              className={`group relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isCurrent
                  ? "bg-primary/[0.08] text-primary shadow-[0_0_14px_var(--primary-glow)]"
                  : isCompleted
                    ? "cursor-pointer text-foreground-dim/70 hover:bg-white/[0.04] hover:text-foreground-dim"
                    : "cursor-default text-foreground-muted/40"
              }`}
            >
              {/* 步骤序号/勾号 · 迷你圆 */}
              <span
                className={`flex size-4 items-center justify-center rounded-full text-[9px] transition-all duration-500 ${
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-[0_0_8px_var(--primary-glow-strong)]"
                    : isCompleted
                      ? "bg-primary/15 text-primary/80"
                      : "bg-white/[0.04] text-foreground-muted/30"
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={8} weight="bold" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="whitespace-nowrap font-medium tracking-wide hidden sm:inline">
                {s.label}
              </span>
            </button>

            {/* 连接线 · 渐变微光 */}
            {!isLast && (
              <div className="flex items-center px-0.5">
                <div
                  className={`h-px w-4 rounded-full transition-all duration-700 ${
                    isCompleted && completedSteps.includes(STEPS[index + 1].key)
                      ? "bg-gradient-to-r from-primary/30 to-primary/20"
                      : isCurrent
                        ? "bg-gradient-to-r from-primary/20 to-white/[0.04]"
                        : "bg-white/[0.04]"
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
