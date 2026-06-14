"use client";
import { useState } from "react";
import { Printer, FileText, DownloadSimple } from "@phosphor-icons/react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ShadowRenderer } from "@/components/themes/shadow-renderer";
import { ThemeGallery } from "@/components/themes/theme-gallery";
import { A4_PX } from "@/lib/page-layout";
import { Button } from "@/components/ui/button";

export function PreviewStep() {
  const resume = useResumeStore((s) => s.resume);
  const setThemeSlug = useResumeStore((s) => s.setThemeSlug);
  const [exporting, setExporting] = useState(false);

  const { data, themeSlug } = resume;
  const hasResumeData = Boolean(data.basics);

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

      // Shadow DOM 内容克隆到 light DOM 供 html2canvas 截图
      const shadowHosts = container.querySelectorAll<HTMLElement>(".shadow-resume-host");
      const clones: Array<{ host: HTMLElement; original: HTMLElement }> = [];
      for (const host of shadowHosts) {
        if (host.shadowRoot) {
          const clone = document.createElement("div");
          clone.innerHTML = host.shadowRoot.innerHTML;
          clone.style.cssText = "position:absolute;left:0;top:0;width:100%;";
          host.style.position = "relative";
          host.appendChild(clone);
          clones.push({ host, original: clone });
        }
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

      // 清理克隆元素
      for (const { original } of clones) {
        original.remove();
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
          {/* Double-Bezel A4 页面 */}
          <div
            className="a4-page mx-auto rounded-[1.75rem] border border-white/[0.04] bg-white/[0.005] p-[3px] shadow-[0_16px_56px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.02)]"
            style={{ width: A4_PX.width }}
          >
            <div
              className="rounded-[calc(1.75rem-3px)] border border-white/[0.03] bg-white p-10 shadow-sm"
              style={{ minHeight: A4_PX.height - 4 }}
            >
              {hasResumeData ? (
                <ShadowRenderer
                  data={data}
                  themeSlug={themeSlug}
                />
              ) : (
                <p className="pt-20 text-center text-slate-300">
                  简历数据为空，请返回上一步重新生成
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧操作面板 · Double-Bezel 玻璃 */}
      <aside className="w-[272px] shrink-0 p-3">
        <div className="flex h-full flex-col gap-5 rounded-[1.75rem] border border-white/[0.05] bg-white/[0.015] p-[3px] shadow-[0_12px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex h-full flex-col gap-5 rounded-[calc(1.75rem-3px)] border border-white/[0.03] bg-[hsl(240,10%,3%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="space-y-5">
            <section>
              <p className="text-[10px] font-medium tracking-wider text-foreground-muted/40 uppercase">
                导出
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <FileText size={15} weight="light" className="text-primary/70" />
                <h2 className="text-sm font-semibold">预览导出</h2>
              </div>

                <div className="mt-4 space-y-4 text-sm">
                  {/* 主题切换 */}
                  <div>
                    <label className="text-xs text-foreground-dim">主题</label>
                    <div className="mt-1 max-h-[320px] overflow-y-auto">
                      <ThemeGallery currentSlug={themeSlug} onSelect={setThemeSlug} />
                    </div>
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

              <section className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                <p className="text-xs leading-5 text-foreground-muted">
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
