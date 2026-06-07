"use client";
import { useState } from "react";
import { Printer, FileText } from "lucide-react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import { templates } from "@/lib/templates";
import { Button } from "@/components/ui/button";

export function PreviewStep() {
  const resume = useResumeStore((s) => s.resume);
  const setTheme = useResumeStore((s) => s.setTheme);
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    setExporting(true);
    document.body.classList.add("print-mode");
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-mode");
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
        <div
          id="resume-preview"
          className="mx-auto bg-white p-10 shadow-sm ring-1 ring-slate-200"
          style={{ width: "820px", minHeight: "1160px" }}
        >
          {resume.modules.map((module) => (
            <ModuleRenderer
              key={module.id}
              module={module}
              theme={resume.theme}
            />
          ))}
        </div>
      </div>

      <aside className="w-[260px] shrink-0 border-l border-slate-200 bg-white p-4">
        <div className="space-y-4">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                预览导出
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <label className="text-xs text-slate-400">模板</label>
                <select
                  value={resume.theme.templateId}
                  onChange={(e) => {
                    const template = templates.find(
                      (t) => t.id === e.target.value,
                    );
                    if (template) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { templateId: _, ...rest } = template.defaults;
                      setTheme({ templateId: template.id, ...rest });
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <p>模块：{resume.modules.length} 个</p>
            </div>
          </section>

          <Button
            variant="primary"
            onClick={exportPDF}
            disabled={exporting}
            className="w-full"
          >
            <Printer size={15} />
            导出 PDF
          </Button>

          <section className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs leading-5 text-slate-500">
              打印弹窗中建议选择 A4、缩放 100%，并关闭浏览器默认页眉页脚。
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
