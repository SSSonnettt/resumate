"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, Minus, Sparkle, ArrowRight, Info } from "@phosphor-icons/react";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { Button } from "@/components/ui/button";

export function InfoChecklist() {
  const checklist = useWizardStore((s) => s.checklist);
  const wizardMessages = useWizardStore((s) => s.wizardMessages);
  const goNext = useWizardStore((s) => s.goNext);
  const [showCelebration, setShowCelebration] = useState(false);

  const hasUserMessages = wizardMessages.some((m) => m.role === "user");

  const collectedCount = checklist.filter(
    (item) => item.status !== "pending",
  ).length;
  const progressPercent =
    checklist.length > 0
      ? Math.round((collectedCount / checklist.length) * 100)
      : 0;
  const allReady = collectedCount === checklist.length && checklist.length > 0;
  const hasAny = collectedCount > 0;
  const pendingCount = checklist.length - collectedCount;

  // 全部完成时触发庆祝效果
  useEffect(() => {
    if (allReady && !showCelebration) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allReady, showCelebration]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.04] p-4">
        <h3 className="text-sm font-semibold tracking-tight">信息收集清单</h3>
        <p className="mt-1 text-xs text-foreground-muted">
          AI 会逐步引导你完成每一项
        </p>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {checklist.map((item) => {
            const isCollected = item.status === "collected";
            const isSkipped = item.status === "skipped";

            return (
              <motion.li
                key={item.key}
                initial={isCollected ? { scale: 0.95, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-300 ${
                    isCollected
                      ? "border border-primary/[0.06] bg-primary/[0.04] text-primary"
                      : isSkipped
                        ? "text-foreground-dim/25 line-through"
                        : "text-foreground-muted/50"
                  }`}
                >
                  {isCollected ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <CheckCircle size={15} weight="light" className="shrink-0 text-primary" />
                    </motion.span>
                  ) : isSkipped ? (
                    <Minus size={15} weight="light" className="shrink-0 text-foreground-muted/15" />
                  ) : (
                    <Circle size={15} weight="light" className="shrink-0 text-foreground-muted/10" />
                  )}
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-[11px] opacity-50">
                    {isCollected
                      ? "已收集"
                      : isSkipped
                        ? "已跳过"
                        : "待收集"}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="border-t border-white/[0.04] p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-foreground-dim">
          <span>收集进度</span>
          <span className="tabular-nums">
            {collectedCount}/{checklist.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_8px_var(--primary-glow)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          />
        </div>

        {/* 全部就绪提示 */}
        <AnimatePresence>
          {allReady && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mt-2 flex items-center justify-center gap-1.5"
            >
              {showCelebration ? (
                <motion.span
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: 3, duration: 0.6 }}
                >
                  <Sparkle size={16} weight="light" className="text-primary" />
                </motion.span>
              ) : (
                <Sparkle size={16} weight="light" className="text-primary" />
              )}
              <p className="text-center text-xs font-medium text-primary">
                全部信息已就绪！
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 立即生成按钮 */}
        <div className="mt-3">
          {!hasUserMessages && (
            <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-secondary/15 bg-secondary/[0.04] px-2.5 py-1.5">
              <Info size={12} weight="light" className="mt-0.5 shrink-0 text-secondary/70" />
              <p className="text-[11px] leading-relaxed text-secondary/70">
                请先在左侧对话框中输入你的经历信息
              </p>
            </div>
          )}
          {hasUserMessages && !allReady && hasAny && (
            <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-secondary/15 bg-secondary/[0.04] px-2.5 py-1.5">
              <Info size={12} weight="light" className="mt-0.5 shrink-0 text-secondary/70" />
              <p className="text-[11px] leading-relaxed text-secondary/70">
                还有 {pendingCount} 项未收集，AI 将根据已有信息自动生成
              </p>
            </div>
          )}
          <Button
            onClick={goNext}
            disabled={!hasAny || !hasUserMessages}
            className="w-full"
          >
            <Sparkle size={15} weight="light" className="mr-1.5" />
            {allReady ? "生成简历" : "立即生成"}
            <span
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-0.5 group-hover:scale-105"
            >
              <ArrowRight size={11} weight="bold" />
            </span>
          </Button>
          {!hasAny && (
            <p className="mt-2 text-center text-[11px] text-foreground-muted">
              请至少提供一项信息后再生成
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
