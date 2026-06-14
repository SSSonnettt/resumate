"use client";
import { useState, useMemo, useCallback } from "react";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { SectionDataEditor } from "@/components/editor/module-data-editor";
import { useResumeStore } from "@/lib/stores/resume-store";
import { THEMES } from "@/lib/themes/registry";
import { CaretDown, CaretRight, Eye, EyeSlash, DownloadSimple, Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { A4_PX } from "@/lib/page-layout";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const SECTION_LABELS: Record<string, string> = {
  basics: "基本信息",
  work: "工作经历",
  education: "教育背景",
  skills: "技能",
  projects: "项目经历",
  awards: "获奖",
  certificates: "证书",
  publications: "出版物",
  volunteer: "志愿者",
  languages: "语言",
  interests: "兴趣",
  references: "推荐信",
};

export function EditingStep() {
  const resume = useResumeStore((s) => s.resume);
  const updateData = useResumeStore((s) => s.updateData);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  // 折叠面板状态：记录哪些 section 被展开
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // 控制每个 section 在简历预览中的可见性（默认全部可见）
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(SECTION_LABELS)) {
      initial[key] = true;
    }
    return initial;
  });

  const availableSections = useMemo(() => {
    const sections: Array<{ key: string; label: string; order: number }> = [];
    let order = 0;
    for (const [key, label] of Object.entries(SECTION_LABELS)) {
      sections.push({ key, label, order: order++ });
    }
    return sections;
  }, []);

  const sectionData = editingSection
    ? (resume.data as Record<string, unknown>)[editingSection]
    : undefined;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    // 切换编辑区
    setEditingSection((prev) => (prev === key ? null : key));
  };

  const toggleSectionVisible = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ---- 导出相关 ----
  const [exporting, setExporting] = useState(false);

  /** 使用 jsPDF + html2canvas 生成真正的 PDF 下载文件 */
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

      // 临时取消缩放，以全尺寸截取
      const contentDiv = container.firstElementChild as HTMLElement | null;
      const origTransform = contentDiv?.style.transform ?? "";
      const origWidth = container.style.width;
      const origHeight = container.style.height;
      const origOverflow = container.style.overflow;

      if (contentDiv) contentDiv.style.transform = "none";
      container.style.width = A4_PX.width + "px";
      container.style.height = "auto";
      container.style.overflow = "visible";

      const pdf = new jsPDF("p", "mm", "a4");
      const a4Width = 210;
      const a4Height = 297;

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

      // 恢复缩放
      if (contentDiv) contentDiv.style.transform = origTransform;
      container.style.width = origWidth;
      container.style.height = origHeight;
      container.style.overflow = origOverflow;

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

  /** 浏览器打印 */
  function printPDF() {
    document.body.classList.add("print-mode");
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-mode");
    }
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="min-w-0">
      {/* 左侧：简历画布 */}
      <ResizablePanel defaultSize={75} minSize={35}>
        <div className="h-full min-w-0 flex items-start justify-center overflow-auto p-3">
          <ResumeCanvas visibleSections={visibleSections} containerId="resume-preview" />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* 右侧：样式/内容面板 · Industrial 结构边框 */}
      <ResizablePanel defaultSize={25} minSize={18}>
        <aside className="h-full w-full flex flex-col gap-3 overflow-y-auto p-3">
          <div className="flex flex-col gap-3 border-2 border-foreground/10 bg-card p-3">
          {/* ---- 导出按钮 ---- */}
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
                {exporting ? "导出中..." : "下载 PDF"}
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

          {/* ---- 简历模版 ---- */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground-dim">
              <span>简历模版</span>
              <a
                href="https://jsonresume.org/themes/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-normal text-primary/70 hover:text-primary transition-colors"
              >
                预览
              </a>
            </h3>
            <select
              value={resume.themeSlug}
              onChange={(e) => useResumeStore.getState().setThemeSlug(e.target.value)}
              className="h-9 w-full border border-[hsl(var(--border))] bg-card px-2.5 text-xs outline-none transition-colors focus:border-accent"
            >
              {THEMES.map((theme) => (
                <option key={theme.slug} value={theme.slug}>
                  {theme.nameZh}
                </option>
              ))}
            </select>
          </section>

          {/* ---- 简历元数据 ---- */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground-dim">简历元数据</h3>
          </section>

          {/* ---- 内容章节（可折叠面板）---- */}
          <div className="space-y-0.5">
            {availableSections.map((section) => {
              const isExpanded = !!expandedSections[section.key];

              return (
                <div key={section.key}>
                  {/* 折叠标题栏 */}
                  <button
                    onClick={() => toggleSection(section.key)}
                    className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-medium transition-all active:scale-[0.98] ${
                      section.key === editingSection
                        ? "bg-primary/10 text-primary"
                        : "text-foreground-dim hover:bg-foreground/5"
                    }`}
                  >
                    <span className="shrink-0">
                      {isExpanded ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                    </span>
                    <span className="truncate flex-1">{section.label}</span>
                    {/* 可见性开关 */}
                    <span
                      role="switch"
                      aria-checked={visibleSections[section.key]}
                      tabIndex={0}
                      onClick={(e) => toggleSectionVisible(section.key, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSectionVisible(section.key, e as unknown as React.MouseEvent);
                        }
                      }}
                      className={`ml-auto inline-flex shrink-0 items-center p-0.5 transition-colors ${
                        visibleSections[section.key]
                          ? "text-primary hover:bg-primary/10"
                          : "text-foreground-muted/30 hover:bg-foreground/5 hover:text-foreground-muted/60"
                      }`}
                      title={visibleSections[section.key] ? "在简历中显示" : "在简历中隐藏"}
                    >
                      {visibleSections[section.key] ? (
                        <Eye size={13} weight="fill" />
                      ) : (
                        <EyeSlash size={13} />
                      )}
                    </span>
                  </button>

                  {/* 展开后的编辑区 */}
                  {isExpanded && sectionData !== undefined && section.key === editingSection && (
                    <div className="mx-2.5 mt-1 mb-2">
                      <SectionDataEditor
                        sectionKey={editingSection}
                        data={sectionData as Record<string, unknown>}
                        onChange={(newData) => {
                          updateData((draft) => {
                            (draft as Record<string, unknown>)[editingSection] = newData;
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
