"use client";
import { useEffect, useRef } from "react";
import { LogStreamView } from "./log-stream-view";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useChatStore } from "@/lib/stores/chat-store";

export function GeneratingStep() {
  const goNext = useWizardStore((s) => s.goNext);
  const markGenerated = useWizardStore((s) => s.markGenerated);
  const harnessEvents = useChatStore((s) => s.harnessEvents);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    const hasPlanDone = harnessEvents.some((e) => e.type === "plan:done");
    if (hasPlanDone) {
      triggeredRef.current = true;
      markGenerated();
      const timer = setTimeout(() => goNext(), 1000);
      return () => clearTimeout(timer);
    }
  }, [harnessEvents, goNext, markGenerated]);

  return <LogStreamView />;
}
