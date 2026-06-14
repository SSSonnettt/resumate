"use client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InfoChecklist } from "./info-checklist";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function ChatStep() {
  const goNext = useWizardStore((s) => s.goNext);

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* 左侧：聊天区域 */}
      <div className="min-w-0 flex-1">
        <ChatPanel
          variant="wizard"
          onGenerate={() => {
            goNext();
          }}
        />
      </div>

      {/* 右侧：信息面板 — Industrial 结构边框 */}
      <aside className="w-[300px] shrink-0">
        <div className="h-full border-2 border-foreground/10 bg-card p-2">
          <InfoChecklist />
        </div>
      </aside>
    </div>
  );
}
