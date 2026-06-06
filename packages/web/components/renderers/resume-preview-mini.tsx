"use client";
import { EmptyState } from "@/components/ui/empty-state";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "./module-renderer";

export function ResumePreviewMini() {
  const resume = useResumeStore((state) => state.resume);

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div
        className="origin-top rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
        style={{ minHeight: "560px" }}
      >
        {resume.modules.map((module) => (
          <ModuleRenderer key={module.id} module={module} theme={resume.theme} />
        ))}
        {resume.modules.length === 0 && (
          <EmptyState title="等待生成简历">
            填写左侧 JD 和个人经历后，这里会实时展示可投递的中文简历预览。
          </EmptyState>
        )}
      </div>
    </div>
  );
}
