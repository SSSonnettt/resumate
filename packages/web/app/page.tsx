"use client";
import { useEffect } from "react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useResumeStore } from "@/lib/stores/resume-store";
import { useChatStore } from "@/lib/stores/chat-store";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { ApiKeyDialog } from "@/components/api-key-dialog";

export default function HomePage() {
  const init = useResumeStore((s) => s.init);

  useEffect(() => {
    init();
    useChatStore.getState().hydrate();
    useWizardStore.getState().hydrate();
  }, [init]);

  return (
    <>
      <ApiKeyDialog />
      <WizardShell />
    </>
  );
}
