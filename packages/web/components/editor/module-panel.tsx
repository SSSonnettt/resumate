"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import type { ModuleType } from "@resumate/shared";
import { GripVertical, Plus, Trash2 } from "lucide-react";

const moduleTypes: { type: ModuleType; label: string }[] = [
  { type: "header", label: "头部" },
  { type: "summary", label: "个人总结" },
  { type: "work-experience", label: "工作经历" },
  { type: "education", label: "教育背景" },
  { type: "skills", label: "技能" },
  { type: "projects", label: "项目经历" },
  { type: "custom", label: "自定义" },
];

export function ModulePanel() {
  const { resume, addModule, removeModule } = useResumeStore();

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-400">STRUCTURE</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">简历模块</h3>
      </div>

      <div className="mb-5 space-y-2">
        {resume.modules.map((module) => (
          <div
            key={module.id}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-slate-700">
              <GripVertical size={14} className="shrink-0 text-slate-300" />
              <span className="truncate">
                {moduleTypes.find((item) => item.type === module.type)?.label ||
                  module.type}
              </span>
            </span>
            <button
              onClick={() => removeModule(module.id)}
              className="rounded p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600"
              title="删除模块"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {resume.modules.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
            暂无模块，从下方添加。
          </p>
        )}
      </div>

      <h4 className="mb-2 text-xs font-medium text-slate-500">添加模块</h4>
      <div className="grid grid-cols-1 gap-2">
        {moduleTypes.map((moduleType) => (
          <button
            key={moduleType.type}
            onClick={() => addModule(moduleType.type)}
            className="flex h-9 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus size={14} />
            {moduleType.label}
          </button>
        ))}
      </div>
    </div>
  );
}
