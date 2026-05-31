"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { templates } from "@/lib/templates";
import type { Theme } from "@ai-resume/shared";

export function StylePanel() {
  const { resume, setTheme } = useResumeStore();

  return (
    <div className="p-4 space-y-6">
      <h3 className="font-semibold">样式</h3>

      {/* 模板选择 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">模板</label>
        <div className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                const { templateId: _, ...rest } = t.defaults;
                setTheme({ templateId: t.id, ...rest });
              }}
              className={`text-sm p-2 rounded border transition-colors ${
                resume.theme.templateId === t.id
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 主色 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          主色
        </label>
        <input
          type="color"
          value={resume.theme.primaryColor}
          onChange={(e) => setTheme({ primaryColor: e.target.value })}
          className="w-full h-8 rounded border cursor-pointer"
        />
      </div>

      {/* 字体 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          字体
        </label>
        <select
          value={resume.theme.fontFamily}
          onChange={(e) =>
            setTheme({
              fontFamily: e.target.value as Theme["fontFamily"],
            })
          }
          className="w-full text-sm rounded border p-2 bg-white"
        >
          <option value="sans">无衬线</option>
          <option value="serif">衬线</option>
          <option value="kai">楷体</option>
        </select>
      </div>

      {/* 字号 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          字号
        </label>
        <select
          value={resume.theme.fontSize}
          onChange={(e) =>
            setTheme({ fontSize: e.target.value as Theme["fontSize"] })
          }
          className="w-full text-sm rounded border p-2 bg-white"
        >
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </div>

      {/* 间距 */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">
          间距
        </label>
        <select
          value={resume.theme.spacing}
          onChange={(e) =>
            setTheme({ spacing: e.target.value as Theme["spacing"] })
          }
          className="w-full text-sm rounded border p-2 bg-white"
        >
          <option value="compact">紧凑</option>
          <option value="normal">标准</option>
          <option value="loose">宽松</option>
        </select>
      </div>
    </div>
  );
}
