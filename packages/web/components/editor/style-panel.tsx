"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { templates } from "@/lib/templates";
import type { Theme } from "@resumate/shared";
import { ModuleDataEditor } from "./module-data-editor";

export function StylePanel() {
  const { resume, setTheme } = useResumeStore();

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">样式系统</h3>
          <p className="mt-1 text-xs text-slate-500">
            控制模板、主色、字号和段落密度。
          </p>
        </div>
        <div className="space-y-5 p-4">

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500">
              模板
            </label>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    const { templateId: _, ...rest } = template.defaults;
                    setTheme({ templateId: template.id, ...rest });
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    resume.theme.templateId === template.id
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-500">
              主色
            </span>
            <input
              type="color"
              value={resume.theme.primaryColor}
              onChange={(event) => setTheme({ primaryColor: event.target.value })}
              className="h-9 w-full cursor-pointer rounded-md border border-slate-200 bg-white"
            />
          </label>

          <SelectField
            label="字体"
            value={resume.theme.fontFamily}
            onChange={(value) =>
              setTheme({ fontFamily: value as Theme["fontFamily"] })
            }
            options={[
              ["sans", "无衬线"],
              ["serif", "衬线"],
              ["kai", "楷体"],
            ]}
          />

          <SelectField
            label="字号"
            value={resume.theme.fontSize}
            onChange={(value) =>
              setTheme({ fontSize: value as Theme["fontSize"] })
            }
            options={[
              ["small", "小"],
              ["medium", "中"],
              ["large", "大"],
            ]}
          />

          <SelectField
            label="间距"
            value={resume.theme.spacing}
            onChange={(value) =>
              setTheme({ spacing: value as Theme["spacing"] })
            }
            options={[
              ["compact", "紧凑"],
              ["normal", "标准"],
              ["loose", "宽松"],
            ]}
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">模块内容</h3>
          <p className="mt-1 text-xs text-slate-500">
            MVP 阶段使用 JSON 做模块级快速编辑。
          </p>
        </div>
        <div className="space-y-3">
          {resume.modules.map((module) => (
            <ModuleDataEditor key={`${module.id}-${module.order}`} module={module} />
          ))}
          {resume.modules.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-400">
              生成或添加模块后可在这里编辑内容。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
