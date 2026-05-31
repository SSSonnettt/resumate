"use client";
import { useEffect, useState } from "react";
import { useResumeStore } from "@/lib/stores/resume-store";
import { ModuleRenderer } from "@/components/renderers/module-renderer";
import { templates } from "@/lib/templates";
import Link from "next/link";

export default function PreviewPage() {
  const { resume, init, setTheme } = useResumeStore();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  async function exportPDF() {
    setExporting(true);
    // 使用浏览器原生打印功能生成 PDF
    // 添加打印样式 class 以隐藏非简历内容
    document.body.classList.add("print-mode");
    try {
      window.print();
    } finally {
      document.body.classList.remove("print-mode");
      setExporting(false);
    }
  }

  async function exportImage() {
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const el = document.getElementById("resume-preview");
      if (!el) {
        setExporting(false);
        return;
      }
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = "简历.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("导出图片失败:", err);
    } finally {
      setExporting(false);
    }
  }

  const currentTemplate = templates.find(
    (t) => t.id === resume.theme.templateId,
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 顶部工具栏 */}
        <div className="flex justify-between items-center mb-4 px-4 print:hidden">
          <Link
            href="/editor"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← 返回编辑
          </Link>
          <div className="flex items-center gap-2">
            {/* 模板快速切换 */}
            <select
              value={resume.theme.templateId}
              onChange={(e) => {
                const t = templates.find((tpl) => tpl.id === e.target.value);
                if (t) {
                  const { templateId: _, ...rest } = t.defaults;
                  setTheme({ templateId: t.id, ...rest });
                }
              }}
              className="text-sm rounded border px-2 py-1.5 bg-white"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={exportPDF}
              disabled={exporting}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              导出 PDF
            </button>
            <button
              onClick={exportImage}
              disabled={exporting}
              className="rounded border px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              导出图片
            </button>
          </div>
        </div>

        {/* 简历预览 */}
        <div
          id="resume-preview"
          className="bg-white shadow-lg mx-auto p-8 print:shadow-none print:p-0 print:w-full"
          style={{ width: "820px", minHeight: "1160px" }}
        >
          {resume.modules.length === 0 ? (
            <div className="text-center text-gray-400 pt-20">
              <p className="text-lg mb-2">暂无简历内容</p>
              <p>
                请先
                <Link
                  href="/"
                  className="text-blue-600 underline mx-1"
                >
                  与 AI 对话
                </Link>
                生成简历，或到
                <Link
                  href="/editor"
                  className="text-blue-600 underline mx-1"
                >
                  编辑器
                </Link>
                手动添加模块。
              </p>
            </div>
          ) : (
            resume.modules.map((mod) => (
              <ModuleRenderer
                key={mod.id}
                module={mod}
                theme={resume.theme}
              />
            ))
          )}
        </div>

        {/* 当前模板信息 */}
        {currentTemplate && (
          <p className="text-center text-xs text-gray-400 mt-4 print:hidden">
            当前模板: {currentTemplate.name}
          </p>
        )}
      </div>
    </div>
  );
}
