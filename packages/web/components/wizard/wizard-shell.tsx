"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { StepIndicator } from "./step-indicator";
import { ConversationSidebar } from "./conversation-sidebar";
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

export function WizardShell() {
  const step = useWizardStore((s) => s.step);

  // 初始化：确保始终有一个活跃会话
  useEffect(() => {
    const { activeConversationId, newConversation } = useWizardStore.getState();
    if (!activeConversationId) {
      newConversation();
    }
  }, []);

  const stepContent = (() => {
    switch (step) {
      case "chat":
        return <ChatStep key="chat" />;
      case "generating":
        return <GeneratingStep key="generating" />;
      case "editing":
        return <EditingStep key="editing" />;
    }
  })();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* ======== 工业导航栏 · 结构边框 ======== */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-sticky flex justify-center pt-4">
        <div className="pointer-events-auto mx-auto flex items-center gap-4 border-2 border-foreground/15 bg-background px-4 py-2">
          {/* Logo · 碳墨标识 */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center border-2 border-foreground/20 bg-foreground/5">
              <span className="text-[11px] font-black text-foreground tracking-tighter">R</span>
            </span>
            <span className="text-[11px] font-black text-foreground tracking-tighter">[ RESUME GENERATION SYSTEM ]</span>
          </div>

          {/* 分割线 */}
          <span className="h-4 w-px bg-foreground/15" aria-hidden="true" />

          {/* 步骤指示器 */}
          <StepIndicator />

          {/* 分割线 */}
          <span className="h-4 w-px bg-foreground/15" aria-hidden="true" />

          {/* GitHub 链接 */}
          <a
            href="https://github.com/SSSonnettt/resumate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 border-2 border-foreground/10 bg-transparent px-2.5 py-1 font-mono text-[11px] text-foreground-muted uppercase tracking-wider transition-colors duration-150 hover:border-foreground/30 hover:text-foreground"
          >
            <GithubLogo size={11} weight="light" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* ======== 主体：侧边栏 + 内容区 ======== */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        <ConversationSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden px-3 pb-3 md:px-5 md:pb-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mx-auto h-full max-w-[1440px]"
              >
                {stepContent}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
