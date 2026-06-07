"use client";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InfoChecklist } from "./info-checklist";
import { useWizardStore } from "@/lib/stores/wizard-store";

export function ChatStep() {
  const goNext = useWizardStore((s) => s.goNext);

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1">
        <ChatPanel
          variant="wizard"
          onGenerate={() => {
            goNext();
          }}
        />
      </div>
      <aside className="w-[280px] shrink-0 border-l border-slate-200 bg-white">
        <InfoChecklist />
      </aside>
    </div>
  );
}
