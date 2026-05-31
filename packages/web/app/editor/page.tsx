"use client";
import { useEffect } from "react";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { ModulePanel } from "@/components/editor/module-panel";
import { StylePanel } from "@/components/editor/style-panel";
import { useResumeStore } from "@/lib/stores/resume-store";
import Link from "next/link";
import { Undo2, Redo2, FileDown } from "lucide-react";

export default function EditorPage() {
  const { init, undo, redo, undoStack, redoStack } = useResumeStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← 对话
          </Link>
          <span className="text-gray-300">|</span>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1 disabled:opacity-30 hover:bg-gray-100 rounded transition-colors"
            title="撤销"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1 disabled:opacity-30 hover:bg-gray-100 rounded transition-colors"
            title="重做"
          >
            <Redo2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/preview"
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <FileDown size={14} />
            预览 & 导出
          </Link>
        </div>
      </header>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧: 模块面板 */}
        <aside className="w-[200px] border-r bg-gray-50 overflow-y-auto shrink-0">
          <ModulePanel />
        </aside>

        {/* 中间: 简历画布 */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <ResumeCanvas />
        </main>

        {/* 右侧: 样式面板 */}
        <aside className="w-[240px] border-l bg-gray-50 overflow-y-auto shrink-0">
          <StylePanel />
        </aside>
      </div>
    </div>
  );
}
