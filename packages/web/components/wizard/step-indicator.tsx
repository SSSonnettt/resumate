"use client";
import { useWizardStore, type Step } from "@/lib/stores/wizard-store";
import { Check } from "@phosphor-icons/react";

const STEPS: { key: Step; label: string }[] = [
  { key: "chat", label: "/// STEP 01: CHAT COLLECTION" },
  { key: "generating", label: "/// STEP 02: GENERATE" },
  { key: "editing", label: "/// STEP 03: EDIT & EXPORT" },
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
              className={`group relative flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
                isCurrent
                  ? "text-foreground"
                  : isCompleted
                    ? "cursor-pointer text-foreground-muted hover:text-foreground/70"
                    : "cursor-default text-foreground-muted/30"
              }`}
            >
              {/* 步骤序号/勾号 · 方形指示器 */}
              <span
                className={`flex size-4 items-center justify-center border text-[9px] font-bold transition-colors duration-150 ${
                  isCurrent
                    ? "bg-foreground text-background border-foreground"
                    : isCompleted
                      ? "border-accent text-accent"
                      : "border-foreground/15 text-foreground-muted/30"
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={8} weight="bold" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="whitespace-nowrap hidden sm:inline">
                {s.label}
              </span>
            </button>

            {/* 连接线 · 实线 */}
            {!isLast && (
              <div className="flex items-center px-0.5">
                <div
                  className={`h-px w-6 transition-colors duration-300 ${
                    isCompleted && completedSteps.includes(STEPS[index + 1].key)
                      ? "bg-foreground/20"
                      : isCurrent
                        ? "bg-accent animate-pulse-hard"
                        : "bg-foreground/10"
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
