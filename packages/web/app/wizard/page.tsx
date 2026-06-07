"use client";
import { useEffect } from "react";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ApiKeyDialog } from "@/components/api-key-dialog";

export default function WizardPage() {
  const init = useResumeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <>
      <ApiKeyDialog />
      <WizardShell />
    </>
  );
}
