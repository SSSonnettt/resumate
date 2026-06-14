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
          {/* A4 页面 · Industrial 结构边框 */}
          <div
            className="a4-page mx-auto border-2 border-foreground/10 bg-card p-[3px]"
            style={{ width: A4_PX.width }}
          >
            <div
              className="border border-foreground/10 bg-background p-10"
              style={{ minHeight: A4_PX.height - 4 }}
            >
              {hasResumeData ? (
                <ShadowRenderer
                  data={data}
                  themeSlug={themeSlug}
                />
              ) : (
                <p className="pt-20 text-center text-foreground-muted">
                  简历数据为空，请返回上一步重新生成
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧操作面板 · Industrial 结构边框 */}
      <aside className="w-[272px] shrink-0 p-3">
        <div className="flex h-full flex-col gap-5 border-2 border-foreground/10 bg-card p-3">
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

              {/* 导出按钮 */}
              <div className="space-y-2">
                <Button
                  onClick={downloadPDF}
                  disabled={exporting}
                  className="group w-full h-10 bg-primary"
                >
                  <span className="flex items-center justify-center bg-foreground/10 p-1 transition-all duration-300 group-hover:scale-105" style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
                    <DownloadSimple size={14} weight="light" />
                  </span>
                  <span className="ml-2 text-sm font-medium">
                    {exporting ? "EXPORTING..." : "DOWNLOAD PDF"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={printPDF}
                  className="w-full"
                >
                  <Printer size={15} weight="light" className="mr-1.5" />
                  浏览器打印
                </Button>
              </div>

              <section className="border border-[hsl(var(--divider))] bg-card p-3">
                <p className="text-xs leading-5 text-foreground-muted">
                  DOWNLOAD PDF 为 A4 尺寸高质量文件。打印选项请在弹窗中选择 A4、缩放 100%。
                </p>
              </section>
            </div>
          </div>
        </aside>
    </div>
  );
}
