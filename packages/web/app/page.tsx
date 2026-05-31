"use client";
import { useEffect } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ResumePreviewMini } from "@/components/renderers/resume-preview-mini";
import { useResumeStore } from "@/lib/stores/resume-store";

export default function HomePage() {
  const init = useResumeStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen">
      <div className="flex-1 border-r">
        <ChatPanel />
      </div>
      <div className="w-[420px] p-4 overflow-y-auto bg-white">
        <h3 className="text-sm text-gray-400 mb-4">简历预览</h3>
        <ResumePreviewMini />
      </div>
    </div>
  );
}
