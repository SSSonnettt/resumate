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

      {/* 右侧：信息面板 — Double-Bezel */}
      <aside className="w-[300px] shrink-0">
        <div className="h-full rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-1.5">
          <div
            className="h-full rounded-[calc(2rem-0.375rem)] border border-white/[0.04]
                        bg-white/[0.015]
                        shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]"
          >
            <InfoChecklist />
          </div>
        </div>
      </aside>
    </div>
  );
}
