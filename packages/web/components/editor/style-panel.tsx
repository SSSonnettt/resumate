"use client";
import { useResumeStore } from "@/lib/stores/resume-store";
import { templates, getTemplate } from "@/lib/templates";
import type { Theme } from "@resumate/shared";

export function StylePanel() {
  const resumeTheme = useResumeStore((state) => state.resume.theme);
  const setTheme = useResumeStore((state) => state.setTheme);
  const setTemplate = useResumeStore((state) => state.setTemplate);

  const currentTemplate = getTemplate(resumeTheme.templateId);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-white/[0.02]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h3 className="text-sm font-semibold">样式系统</h3>
          <p className="mt-1 text-xs text-foreground-dim">
            切换模板或微调颜色与字体。
          </p>
        </div>
        <div className="space-y-5 p-4">
          {/* 模板选择 */}
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground-dim">
              模板
            </label>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setTemplate(template.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    resumeTheme.templateId === template.id
                      ? "border-primary/20 bg-primary/[0.06] text-primary"
                      : "border-white/[0.06] bg-white/[0.02] text-foreground-dim hover:bg-white/[0.04]"
                  }`}
                >
                  {template.nameZh || template.name}
                </button>
              ))}
            </div>
          </div>

          {/* 主色 */}
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-foreground-dim">
              主色
            </span>
            <input
              type="color"
              value={resumeTheme.colors.primary}
              onChange={(event) =>
                setTheme({ colors: { ...resumeTheme.colors, primary: event.target.value } })
              }
              className="h-9 w-full cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02]"
            />
          </label>

          {/* 字体 */}
          <SelectField
            label="字体"
            value={resumeTheme.typography.fontFamily}
            onChange={(value) =>
              setTheme({
                typography: {
                  ...resumeTheme.typography,
                  fontFamily: value as Theme["typography"]["fontFamily"],
                },
              })
            }
            options={[
              ["sans", "无衬线"],
              ["serif", "衬线"],
              ["kai", "楷体"],
              ["mono", "等宽"],
            ]}
          />

          {/* 间距 */}
          <SelectField
            label="间距"
            value={resumeTheme.spacing}
            onChange={(value) =>
              setTheme({ spacing: value as Theme["spacing"] })
            }
            options={[
              ["compact", "紧凑"],
              ["normal", "标准"],
              ["loose", "宽松"],
            ]}
          />

          {/* 恢复默认 */}
          {currentTemplate && (
            <button
              onClick={() => setTemplate(currentTemplate.id)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs text-foreground-dim transition-colors hover:bg-white/[0.04]"
            >
              恢复模板默认
            </button>
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
      <span className="mb-2 block text-xs font-medium text-foreground-dim">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 text-sm outline-none transition-colors focus:border-primary/25"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-background">
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
