"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, FileDown } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ResumePreviewMini } from "@/components/renderers/resume-preview-mini";
import { useChatStore } from "@/lib/stores/chat-store";
import { useResumeStore } from "@/lib/stores/resume-store";

const progressSteps = [
  { id: "classify", label: "识别需求" },
  { id: "collect", label: "整理信息" },
  { id: "generate", label: "生成简历" },
  { id: "validate", label: "校验结构" },
  { id: "present", label: "准备编辑" },
];

export default function HomePage() {
  const init = useResumeStore((state) => state.init);
  const resume = useResumeStore((state) => state.resume);
  const harnessEvents = useChatStore((state) => state.harnessEvents);

  useEffect(() => {
    init();
  }, [init]);

  const completedSteps = new Set(
    harnessEvents
      .filter((event) => event.type === "step:done")
      .map((event) => event.stepId),
  );

  return (
    <main className="grid h-screen grid-cols-[minmax(520px,1fr)_460px] bg-slate-100 text-slate-900">
      <div className="min-w-0 border-r border-slate-200">
        <ChatPanel />
      </div>
      <aside className="flex min-w-0 flex-col overflow-hidden bg-white">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-400">实时预览</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">
                中文投递简历
              </h2>
            </div>
            <Link
              href="/preview"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <FileDown size={15} />
              导出
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {progressSteps.map((step) => {
              const done = completedSteps.has(step.id);
              return (
                <div
                  key={step.id}
                  className={`rounded-md border px-2 py-2 ${
                    done
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  <div className="mb-1">
                    {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  </div>
                  <p className="text-[11px] font-medium leading-4">{step.label}</p>
                </div>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
          <ResumePreviewMini />
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {resume.modules.length} 个简历模块
              </p>
              <p className="mt-1 text-xs text-slate-500">
                生成后进入编辑器调整顺序、内容和样式。
              </p>
            </div>
            <Link
              href="/editor"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              编辑
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </footer>
      </aside>
    </main>
  );
}
