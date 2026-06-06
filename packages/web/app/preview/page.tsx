"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import { templates } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function PreviewPage() {
  const { resume, init, setTheme } = useResumeStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

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

  const currentTemplate = templates.find(
    (template) => template.id === resume.theme.templateId,
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/editor"
            className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            返回编辑
          </Link>
          <div className="text-center">
            <p className="text-xs font-medium text-slate-400">PDF Preview</p>
            <h1 className="text-sm font-semibold text-slate-900">
              投递前检查
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={resume.theme.templateId}
              onChange={(event) => {
                const template = templates.find(
                  (item) => item.id === event.target.value,
                );
                if (template) {
                  const { templateId: _, ...rest } = template.defaults;
                  setTheme({ templateId: template.id, ...rest });
                }
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <Button variant="primary" onClick={exportPDF} disabled={exporting}>
              <Printer size={15} />
              导出 PDF
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-[1fr_260px] gap-6 px-6 py-6 print:block print:p-0">
        <div
          id="resume-preview"
          className="mx-auto bg-white p-10 shadow-sm ring-1 ring-slate-200 print:mx-0 print:w-full print:p-0 print:shadow-none print:ring-0"
          style={{ width: "820px", minHeight: "1160px" }}
        >
          {resume.modules.length === 0 ? (
            <EmptyState title="暂无简历内容">
              请先回到工作台生成简历，或在编辑器中手动添加模块。
            </EmptyState>
          ) : (
            resume.modules.map((module) => (
              <ModuleRenderer
                key={module.id}
                module={module}
                theme={resume.theme}
              />
            ))
          )}
        </div>

        <aside className="space-y-4 print:hidden">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                导出检查
              </h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>模板：{currentTemplate?.name ?? "未知模板"}</p>
              <p>模块：{resume.modules.length} 个</p>
              <p>导出方式：浏览器打印为 PDF</p>
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">投递建议</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              打印弹窗中建议选择 A4、缩放 100%，并关闭浏览器默认页眉页脚。
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
