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
      {/* ======== 浮空玻璃药丸导航栏 ======== */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-sticky flex justify-center pt-4">
        <div className="pointer-events-auto glass-pill mx-auto flex items-center gap-4 px-4 py-2 shadow-[0_4px_32px_rgba(0,0,0,0.45),inset_0_1px_0_hsl(var(--glass-highlight))]">
          {/* Logo · 浮空标识 */}
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/[0.1] ring-1 ring-primary/10">
              <span className="text-[11px] font-bold text-primary tracking-tighter">R</span>
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-foreground">Resumate</span>
          </div>

          {/* 分割线 */}
          <span className="h-4 w-px bg-white/[0.06]" aria-hidden="true" />

          {/* 步骤指示器 · 浮空嵌入 */}
          <StepIndicator />

          {/* 分割线 */}
          <span className="h-4 w-px bg-white/[0.06]" aria-hidden="true" />

          {/* GitHub 链接 · 迷你药丸 */}
          <a
            href="https://github.com/SSSonnettt/resumate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] px-2.5 py-1 text-[11px] text-foreground-muted transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-foreground active:scale-[0.97]"
          >
            <GithubLogo size={11} weight="light" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {/* ======== 主体：侧边栏 + 内容区 · 非对称 Bento 布局 ======== */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        <ConversationSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 内容区 · breathing room */}
          <main className="flex-1 overflow-hidden px-3 pb-3 md:px-5 md:pb-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ y: 16, opacity: 0, filter: "blur(3px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -10, opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
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
