"use client";
import { useEffect } from "react";
import { ResumeCanvas } from "@/components/editor/resume-canvas";
import { ModulePanel } from "@/components/editor/module-panel";
import { StylePanel } from "@/components/editor/style-panel";
import { useResumeStore } from "@/lib/stores/resume-store";
import Link from "next/link";
import { ArrowLeft, FileDown, Redo2, Undo2 } from "lucide-react";

export default function EditorPage() {
  const { init, undo, redo, undoStack, redoStack } = useResumeStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            工作台
          </Link>
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-35"
            title="撤销"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-35"
            title="重做"
          >
            <Redo2 size={18} />
          </button>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-slate-400">Resume Editor</p>
          <h1 className="text-sm font-semibold text-slate-900">模块级精修</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/preview"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <FileDown size={14} />
            预览导出
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[240px_minmax(760px,1fr)_360px] overflow-hidden">
        <aside className="shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          <ModulePanel />
        </aside>

        <main className="overflow-y-auto bg-slate-100 p-6">
          <ResumeCanvas />
        </main>

        <aside className="shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50">
          <StylePanel />
        </aside>
      </div>
    </div>
  );
}
