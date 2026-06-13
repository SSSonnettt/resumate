"use client";
import { useState } from "react";
import { Printer, FileText, DownloadSimple } from "@phosphor-icons/react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ResumeRenderer } from "@/components/renderers/resume-renderer";
import { templates, getTemplate } from "@/lib/templates";
import { A4_PX } from "@/lib/page-layout";
import { Button } from "@/components/ui/button";

export function PreviewStep() {
  const resume = useResumeStore((s) => s.resume);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const [exporting, setExporting] = useState(false);

  const template = getTemplate(resume.theme.templateId);
  const { data, theme } = resume;

  /** 使用 jsPDF + html2canvas 生成真正的 PDF 下载文件（逐页渲染） */
  async function downloadPDF() {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const container = document.getElementById("resume-preview");
      if (!container) {
        alert("未找到简历预览元素");
        return;
      }

      // 获取所有 A4 页面元素
      const pageElements = container.querySelectorAll<HTMLElement>(".a4-page");
      if (pageElements.length === 0) {
        alert("未找到简历页面内容");
        return;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const a4Width = 210; // mm
      const a4Height = 297; // mm

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, 0, a4Width, a4Height);
      }

      pdf.save("resume.pdf");
    } catch (err) {
      console.warn("PDF 导出失败:", err);
      alert("PDF 导出失败，请尝试使用打印选项。");
    } finally {
      setExporting(false);
    }
  }

  /** 备用：浏览器打印 */
  function printPDF() {
    document.body.classList.add("print-mode");
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-mode");
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* 预览区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          id="resume-preview"
          className="mx-auto"
          style={{ width: A4_PX.width }}
        >
          {template ? (
            <div
              className="a4-page mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.015] p-0.5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
              style={{ width: A4_PX.width }}
            >
              <div
                className="rounded-[calc(1.5rem-0.125rem)] bg-white p-10 shadow-sm"
                style={{ minHeight: A4_PX.height - 4 }}
              >
                <ResumeRenderer
                  data={data}
                  template={template}
                  colors={theme.colors}
                  typography={theme.typography}
                />
              </div>
            </div>
          ) : (
            <p className="pt-20 text-center text-slate-300">未找到模板</p>
          )}
        </div>
      </div>

      {/* 右侧操作面板 — Double-Bezel */}
      <aside className="w-[260px] shrink-0 p-3">
        <div className="flex h-full flex-col rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-1.5">
          <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] border border-white/[0.04] bg-white/[0.015] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] p-4">
            <div className="space-y-5">
              <section>
                <p className="text-[10px] font-medium tracking-[0.15em] text-foreground-dim uppercase">Export</p>
                <div className="mt-1 flex items-center gap-2">
                  <FileText size={16} weight="light" className="text-primary" />
                  <h2 className="text-sm font-semibold">预览导出</h2>
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  {/* 模板切换 */}
                  <div>
                    <label className="text-xs text-foreground-dim">模板</label>
                    <select
                      value={resume.theme.templateId}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-sm outline-none transition-colors focus:border-primary/25"
                    >
                      {templates.map((t: { id: string; nameZh?: string; name: string }) => (
                        <option key={t.id} value={t.id} className="bg-background">
                          {t.nameZh || t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-foreground-dim">
                    <p>
                      已填写：
                      {[
                        data.basics && "基本信息",
                        data.work?.length && `工作(${data.work.length})`,
                        data.education?.length && `教育(${data.education.length})`,
                        data.skills?.length && `技能(${data.skills.length})`,
                        data.projects?.length && `项目(${data.projects.length})`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "暂无"}
                    </p>
                  </div>
                </div>
              </section>

              {/* 导出按钮 — Button-in-Button */}
              <div className="space-y-2">
                <Button
                  onClick={downloadPDF}
                  disabled={exporting}
                  className="group w-full h-10 rounded-full bg-primary shadow-[0_0_20px_var(--primary-glow)]"
                >
                  <span className="flex items-center justify-center rounded-full bg-white/20 p-1 transition-all duration-300 group-hover:scale-105" style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                    <DownloadSimple size={14} weight="light" />
                  </span>
                  <span className="ml-2 text-sm font-medium">
                    {exporting ? "导出中..." : "下载 PDF"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={printPDF}
                  className="w-full rounded-full"
                >
                  <Printer size={15} weight="light" className="mr-1.5" />
                  浏览器打印
                </Button>
              </div>

              <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <p className="text-xs leading-5 text-foreground-dim">
                  下载 PDF 为 A4 尺寸高质量文件。打印选项请在弹窗中选择 A4、缩放 100%。
                </p>
              </section>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
