"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "./module-renderer";

export function ResumePreviewMini() {
  const resume = useResumeStore((s) => s.resume);

  return (
    <div
      className="scale-[0.45] origin-top-left bg-white shadow p-4"
      style={{ width: "820px", minHeight: "1160px" }}
    >
      {resume.modules.map((mod) => (
        <ModuleRenderer key={mod.id} module={mod} theme={resume.theme} />
      ))}
      {resume.modules.length === 0 && (
        <p className="text-gray-300 text-center pt-20">
          开始对话生成简历...
        </p>
      )}
    </div>
  );
}
