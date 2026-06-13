"use client";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { StepIndicator } from "./step-indicator";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { StepSkeleton } from "./step-skeleton";
import { GithubLogo } from "@phosphor-icons/react";

const ChatStep = dynamic(
  () => import("./chat-step").then((m) => ({ default: m.ChatStep })),
  { loading: () => <StepSkeleton /> },
);
const GeneratingStep = dynamic(
  () => import("./generating-step").then((m) => ({ default: m.GeneratingStep })),
  { loading: () => <StepSkeleton /> },
);
const EditingStep = dynamic(
  () => import("./editing-step").then((m) => ({ default: m.EditingStep })),
  { loading: () => <StepSkeleton /> },
);
const PreviewStep = dynamic(
  () => import("./preview-step").then((m) => ({ default: m.PreviewStep })),
  { loading: () => <StepSkeleton /> },
);

export function WizardShell() {
  const step = useWizardStore((s) => s.step);

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
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* 顶部标题栏 — 常规网站标题栏 */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 md:px-8">
          <span className="text-sm font-bold tracking-tight">Resumate</span>

          <a
            href="https://github.com/SSSonnettt/resumate"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            <GithubLogo size={14} weight="light" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* 步骤指示器 — 浮动居中玻璃 pill */}
      <div className="flex justify-center py-4">
        <StepIndicator />
      </div>

      {/* 内容区 — 大量留白 + 垂直 fade-up 动画 */}
      <main className="flex-1 overflow-hidden px-4 pt-6 pb-0 md:px-8 md:pt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ y: 24, opacity: 0, filter: "blur(2px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="mx-auto h-full max-w-[1440px]"
          >
            {stepContent}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}
