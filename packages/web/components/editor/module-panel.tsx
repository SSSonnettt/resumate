"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import type { ModuleType } from "@ai-resume/shared";
import { Plus, Trash2 } from "lucide-react";

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
      <h3 className="font-semibold mb-3">模块</h3>

      {/* 当前模块列表 */}
      <div className="space-y-1 mb-4">
        {resume.modules.map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-gray-100"
          >
            <span>
              {moduleTypes.find((t) => t.type === mod.type)?.label || mod.type}
            </span>
            <button
              onClick={() => removeModule(mod.id)}
              className="text-red-400 hover:text-red-600 transition-colors"
              title="删除模块"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {resume.modules.length === 0 && (
          <p className="text-xs text-gray-400 py-2">暂无模块，从下方添加</p>
        )}
      </div>

      {/* 添加模块 */}
      <h4 className="text-xs text-gray-500 mb-2">添加模块</h4>
      <div className="space-y-1">
        {moduleTypes.map((mt) => (
          <button
            key={mt.type}
            onClick={() => addModule(mt.type)}
            className="flex items-center gap-2 text-sm w-full px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            <Plus size={14} />
            {mt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
