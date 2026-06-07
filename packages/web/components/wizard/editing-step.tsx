"use client";
import { ModulePanel } from "@/components/editor/module-panel";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { StylePanel } from "@/components/editor/style-panel";

export function EditingStep() {
  return (
    <div className="grid flex-1 grid-cols-[240px_minmax(760px,1fr)_360px] overflow-hidden">
      <aside className="shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <ModulePanel />
      </aside>

      <main className="overflow-y-auto bg-slate-100 p-6">
        <ResumeCanvas />
      </main>

      <aside className="shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50">
        <StylePanel />
      </aside>
    </div>
  );
}
